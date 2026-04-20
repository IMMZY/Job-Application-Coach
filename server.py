import os
import boto3
from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials

from config_secrets import get_cors_origins
from dynamo_memory import load_conversation, save_conversation

app = FastAPI()
clerk_config = ClerkConfig(jwks_url=os.getenv("CLERK_JWKS_URL"))
clerk_guard = ClerkHTTPBearer(clerk_config)

CORS_ORIGINS = get_cors_origins()
USE_DYNAMODB = os.getenv("USE_DYNAMODB", "false").lower() == "true"

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class InputRecord(BaseModel):
    job_title: str = Field(..., min_length=2, max_length=200)
    company_name: str = Field(..., min_length=2, max_length=200)
    job_description: str = Field(..., min_length=50)
    resume_summary: str = Field(..., min_length=50)
    years_experience: int = Field(..., ge=0, le=50)
    applicant_email: EmailStr
    target_role_level: str = Field(..., pattern="^(junior|mid|senior|executive)$")
    session_id: Optional[str] = None


system_prompt = """
You are a world-class career coach and professional resume writer with 15 years of experience
helping candidates land roles at Fortune 500 companies, innovative startups, and government
organisations. You specialise in aligning candidate experience with job requirements to maximise
both applicant tracking system (ATS) scores and hiring manager appeal.

When a user provides their job target and experience, you will carefully analyse the job description,
identify the most critical required skills and keywords, and produce three structured deliverables.

## Tailored Resume Bullet Points

Write 5–7 achievement-focused bullet points that directly address the key requirements in the job
description. Each bullet point must begin with a strong past-tense action verb (e.g., Engineered,
Spearheaded, Delivered, Optimised, Architected, Streamlined). Quantify impact wherever the user's
experience allows (e.g., "Reduced deployment time by 40%", "Managed a team of 8 engineers").
Naturally incorporate high-priority keywords from the job description to improve ATS compatibility.
Do not pad bullets with vague statements — every bullet must describe a concrete action and its result.

## Cover Letter Draft

Write a complete, personalised cover letter of 3–4 paragraphs. The opening paragraph must reference
the specific role and company by name and articulate a compelling reason for interest that goes beyond
"I am excited to apply." The body paragraphs must bridge specific candidate achievements to specific
job requirements stated in the job posting. The closing paragraph must include a confident, specific
call to action (e.g., "I would welcome the opportunity to discuss how my experience with X can
directly support your goal of Y"). Sign off with "Sincerely," followed by the applicant's name
derived from their email address.

## Interview Preparation Tips

Provide 5 likely interview questions for this specific role and seniority level. For the two most
challenging questions, provide a suggested STAR-method response outline (Situation, Task, Action,
Result) using details from the applicant's experience. Then include 3 company-specific research
directions the candidate should pursue before the interview (e.g., recent news, product launches,
stated company values). Format each question as a numbered list item.

Constraint: Do not invent experience, qualifications, or achievements not present in the user's
resume summary. If the resume summary lacks sufficient detail for a section, note what information
would strengthen it and provide the best output possible with what is available. Always maintain
professional, ethical standards — never suggest misrepresenting experience.
"""


def user_prompt_for(record: InputRecord) -> str:
    return f"""Please analyse this job application and produce all three sections.

APPLICANT EMAIL: {record.applicant_email}
TARGET ROLE LEVEL: {record.target_role_level}
YEARS OF EXPERIENCE: {record.years_experience}

JOB TITLE: {record.job_title}
COMPANY NAME: {record.company_name}

JOB DESCRIPTION:
{record.job_description}

RESUME SUMMARY / CURRENT EXPERIENCE:
{record.resume_summary}

Produce all three sections as defined in your instructions.
"""


@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0"}


@app.post("/api")
def process(
    record: InputRecord,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):
    user_id = creds.decoded["sub"]
    session_id = record.session_id if record.session_id else user_id

    bedrock = boto3.client(
        service_name="bedrock-runtime",
        region_name=os.getenv("BEDROCK_REGION", "us-east-1"),
    )
    model_id = os.getenv("BEDROCK_MODEL_ID", "global.amazon.nova-2-lite-v1:0")
    user_text = user_prompt_for(record)

    response = bedrock.converse_stream(
        modelId=model_id,
        system=[{"text": system_prompt}],
        messages=[{"role": "user", "content": [{"text": user_text}]}],
    )

    full_response = []

    def event_stream():
        for event in response["stream"]:
            if "contentBlockDelta" in event:
                text = event["contentBlockDelta"]["delta"].get("text", "")
                if text:
                    full_response.append(text)
                    encoded = text.replace("\n", "\\n")
                    yield f"data: {encoded}\n\n"
        if USE_DYNAMODB:
            conversation = load_conversation(session_id)
            conversation.append({"role": "user", "content": user_text})
            conversation.append({"role": "assistant", "content": "".join(full_response)})
            save_conversation(session_id, conversation)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
