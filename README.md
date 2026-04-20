# Job Application Coach

AI-powered tool that generates tailored resume bullet points, a personalised cover letter, and interview prep from a job description and your experience summary.

## Screenshot

<!-- Add screenshot here -->

## Live Demo

- **Vercel:** https://job-application-coach.vercel.app
- **CloudFront:** https://XXXXXXXXXXXX.cloudfront.net

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS, ReactMarkdown |
| Auth | Clerk (JWT, JWKS verification) |
| Vercel API | FastAPI + OpenAI GPT-4o-mini, SSE streaming |
| AWS API | FastAPI + Amazon Bedrock Nova Lite, SSE streaming |
| Compute | AWS Lambda (Python 3.12, Mangum adapter) |
| API Gateway | AWS API Gateway HTTP API |
| CDN | AWS CloudFront (PriceClass_100) |
| Storage | AWS S3 (static frontend) + DynamoDB (conversation history) |
| Secrets | AWS Secrets Manager |
| IaC | Terraform (workspaces: dev / prod) |
| CI/CD | GitHub Actions with OIDC (no long-lived keys) |

## Architecture Overview

```
Browser → CloudFront → S3 (Next.js static)
Browser → API Gateway → Lambda (FastAPI/Mangum) → Bedrock Nova Lite
                                                 → DynamoDB (session history)
                                                 → Secrets Manager (CORS config)
```

## Local Development

```bash
# 1. Install frontend dependencies
npm install

# 2. Create .env.local with your keys
cp .env.local.example .env.local
# Fill in OPENAI_API_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLERK_JWKS_URL

# 3. Start the Python backend (Vercel dev)
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000

# 4. Start Next.js dev server
npm run dev
# Visit http://localhost:3000
```

## Deployment

### Manual (Terraform + AWS)

```bash
# Package Lambda
.\infra\package.ps1

# Deploy infrastructure
cd infra
terraform init
terraform workspace new dev
terraform apply

# Upload frontend
npm run build
aws s3 sync out/ s3://$(terraform output -raw frontend_bucket) --delete

# Set CORS after CloudFront is created
aws secretsmanager update-secret \
  --secret-id job-application-coach/config-dev \
  --secret-string '{"CORS_ORIGINS":"https://YOUR_CF_DOMAIN.cloudfront.net"}'
```

### Automated (GitHub Actions)

Push to `main` — the workflow packages Lambda, builds the frontend, runs `terraform apply`, syncs S3, and invalidates CloudFront.

Required GitHub Secrets: `AWS_ROLE_ARN`, `DEFAULT_AWS_REGION`, `CLERK_JWKS_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`.

## API Endpoints

### `POST /api`

**Request**
```json
{
  "job_title": "Software Developer",
  "company_name": "Acme Corp",
  "job_description": "Full job posting text (min 50 chars)...",
  "resume_summary": "Your experience narrative (min 50 chars)...",
  "years_experience": 3,
  "applicant_email": "you@example.com",
  "target_role_level": "mid",
  "session_id": null
}
```

**Response** — SSE stream of `data:` lines that concatenate to Markdown with three sections:
- `## Tailored Resume Bullet Points`
- `## Cover Letter Draft`
- `## Interview Preparation Tips`

### `GET /health`

```json
{"status": "healthy", "version": "1.0"}
```

## Known Limitations

- Non-streaming fallback not implemented (SSE only)
- No file upload — resume must be pasted as text
- Session history is per-user, not per-job-application

## Future Improvements

- Multi-turn refinement ("make the cover letter more formal")
- Application tracker to store and compare multiple job targets
- PDF/DOCX export of all three sections
