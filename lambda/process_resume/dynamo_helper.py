import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import boto3


# Create DynamoDB resources once and reuse across warm Lambda invocations.
region = os.environ.get("AWS_REGION_NAME", "us-east-1")
dynamodb = boto3.resource("dynamodb", region_name=region)
table = dynamodb.Table(os.environ["DYNAMODB_TABLE"])


def now_iso() -> str:
    """Return a UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def get_resume_item(resume_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single resume record by partition key."""
    response = table.get_item(Key={"resume_id": resume_id})
    return response.get("Item")


def put_result(item: Dict[str, Any]) -> None:
    """Upsert a resume screening result row in DynamoDB."""
    table.put_item(Item=item)


def build_failed_item(
    resume_id: str,
    resume_name: str,
    error_message: str,
    uploaded_at: Optional[str] = None,
    raw_response: Optional[str] = None
) -> Dict[str, Any]:
    """Create a normalized failed-status item for consistent error reporting."""
    record = {
        "resume_id": resume_id,
        "resume_name": resume_name,
        "score": 0,
        "recommendation": "Reject",
        "summary": "Resume screening failed. Please review the error details.",
        "strengths": [],
        "weaknesses": [],
        "skill_match": [],
        "missing_skills": [],
        "uploaded_at": uploaded_at or now_iso(),
        "status": "failed",
        "error": error_message,
    }

    # Preserve model raw text when JSON parsing fails for debugging.
    if raw_response is not None:
        record["raw_response"] = raw_response

    return record
