import os
import time
import boto3

_table = None


def _get_table():
    global _table
    if _table is None:
        dynamodb = boto3.resource(
            "dynamodb",
            region_name=os.getenv("BEDROCK_REGION", "us-east-1"),
        )
        _table = dynamodb.Table(
            os.getenv("DYNAMODB_TABLE", "job-application-coach-dev-conversations")
        )
    return _table


def load_conversation(session_id: str) -> list:
    try:
        response = _get_table().get_item(Key={"session_id": session_id})
        item = response.get("Item")
        if item:
            return item.get("messages", [])
    except Exception:
        pass
    return []


def save_conversation(session_id: str, messages: list) -> None:
    ttl = int(time.time()) + 30 * 24 * 60 * 60  # 30-day TTL
    try:
        _get_table().put_item(
            Item={
                "session_id": session_id,
                "messages": messages,
                "ttl": ttl,
            }
        )
    except Exception:
        pass
