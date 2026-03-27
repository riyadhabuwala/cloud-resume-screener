import json
import os
from decimal import Decimal
from typing import Any

import boto3


# Create DynamoDB table handle once for warm Lambda reuse.
region = os.environ.get("AWS_REGION_NAME", "us-east-1")
dynamodb = boto3.resource("dynamodb", region_name=region)
table = dynamodb.Table(os.environ.get("DYNAMODB_TABLE", "ResumeResults"))


def _cors_headers() -> dict:
    """Return CORS headers required by browser-based frontend requests."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def _json_default_serializer(value: Any):
    """Convert DynamoDB Decimal values to native JSON number types."""
    if isinstance(value, Decimal):
        if value % 1 == 0:
            return int(value)
        return float(value)
    raise TypeError(f"Type {type(value)} is not JSON serializable")


def lambda_handler(event, context):
    """Serve GET /results by scanning ResumeResults and sorting by score."""
    method = (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method")
        or ""
    ).upper()

    # Reply early to CORS preflight checks.
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": _cors_headers(),
            "body": json.dumps({"message": "CORS preflight OK"}),
        }

    if method and method != "GET":
        return {
            "statusCode": 405,
            "headers": _cors_headers(),
            "body": json.dumps({"message": "Method not allowed"}),
        }

    try:
        # Fetch all resume records from DynamoDB.
        scan_result = table.scan()
        items = scan_result.get("Items", [])

        # Return only the required API response fields per resume record.
        sanitized = [
            {
                "resume_id": item.get("resume_id", ""),
                "resume_name": item.get("resume_name", ""),
                "score": int(item.get("score", 0)),
                "recommendation": item.get("recommendation", "Maybe"),
                "summary": item.get("summary", ""),
                "strengths": item.get("strengths", []) or [],
                "weaknesses": item.get("weaknesses", []) or [],
                "skill_match": item.get("skill_match", []) or [],
                "missing_skills": item.get("missing_skills", []) or [],
                "uploaded_at": item.get("uploaded_at", ""),
                "status": item.get("status", "processing"),
                "error": item.get("error", ""),
            }
            for item in items
        ]

        # Sort by score descending, defaulting missing scores to 0.
        sorted_items = sorted(
            sanitized,
            key=lambda item: int(item.get("score", 0)),
            reverse=True,
        )

        response = {
            "resumes": sorted_items,
            "total": len(sorted_items),
        }

        return {
            "statusCode": 200,
            "headers": _cors_headers(),
            "body": json.dumps(response, default=_json_default_serializer),
        }

    except Exception as error:
        return {
            "statusCode": 500,
            "headers": _cors_headers(),
            "body": json.dumps({"message": "Failed to fetch results", "error": str(error)}),
        }
