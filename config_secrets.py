import os
import json
import boto3

_cors_origins = None


def get_cors_origins() -> list[str]:
    global _cors_origins
    if _cors_origins is not None:
        return _cors_origins

    env_value = os.getenv("CORS_ORIGINS")
    if env_value:
        _cors_origins = [o.strip() for o in env_value.split(",")]
        return _cors_origins

    secret_name = os.getenv("SECRET_NAME", "job-application-coach/config-dev")
    region = os.getenv("BEDROCK_REGION", "us-east-1")
    try:
        client = boto3.client("secretsmanager", region_name=region)
        secret = client.get_secret_value(SecretId=secret_name)
        data = json.loads(secret["SecretString"])
        origins = data.get("CORS_ORIGINS", "*")
        _cors_origins = [o.strip() for o in origins.split(",")]
    except Exception:
        _cors_origins = ["*"]

    return _cors_origins
