import json
import os
import re
from datetime import datetime, timezone
from uuid import uuid4

import boto3


# Initialize AWS clients/resources once for better Lambda performance.
region = os.environ.get("AWS_REGION", "us-east-1")
s3_client = boto3.client("s3", region_name=region)
dynamodb = boto3.resource("dynamodb", region_name=region)
table = dynamodb.Table(os.environ.get("DYNAMODB_TABLE", "ResumeResults"))


def _cors_headers() -> dict:
    """Return CORS headers for upload URL requests from browser clients."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def _safe_filename(filename: str) -> str:
    """Allow only safe filename characters to avoid problematic S3 object keys."""
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "_", filename.strip())
    return cleaned or "resume.pdf"


def _now_iso() -> str:
    """Generate UTC timestamp string used in DynamoDB items."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def lambda_handler(event, context):
    """Handle POST /get-upload-url to create a presigned S3 PUT URL per resume file."""
    method = (event.get("httpMethod") or "").upper()

    # Respond to browser preflight request.
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": _cors_headers(),
            "body": json.dumps({"message": "CORS preflight OK"}),
        }

    if method != "POST":
        return {
            "statusCode": 405,
            "headers": _cors_headers(),
            "body": json.dumps({"message": "Method not allowed"}),
        }

    try:
        body = json.loads(event.get("body") or "{}")
        filename = body.get("filename", "")
        job_description = body.get("job_description", "").strip()

        if not filename.lower().endswith(".pdf"):
            return {
                "statusCode": 400,
                "headers": _cors_headers(),
                "body": json.dumps({"message": "Only PDF files are allowed."}),
            }

        if not job_description:
            return {
                "statusCode": 400,
                "headers": _cors_headers(),
                "body": json.dumps({"message": "Job description is required."}),
            }

        resume_id = str(uuid4())
        safe_name = _safe_filename(filename)
        object_key = f"resumes/{resume_id}_{safe_name}"

        # Generate a time-limited URL for direct browser-to-S3 PDF upload.
        upload_url = s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": os.environ["S3_BUCKET"],
                "Key": object_key,
                "ContentType": "application/pdf",
            },
            ExpiresIn=300,
        )

        # Persist initial upload record and job description for downstream processing.
        table.put_item(
            Item={
                "resume_id": resume_id,
                "resume_name": safe_name,
                "score": 0,
                "recommendation": "Maybe",
                "summary": "Resume uploaded and queued for screening.",
                "strengths": [],
                "weaknesses": [],
                "skill_match": [],
                "missing_skills": [],
                "uploaded_at": _now_iso(),
                "status": "processing",
                "job_description": job_description,
            }
        )

        return {
            "statusCode": 200,
            "headers": _cors_headers(),
            "body": json.dumps(
                {
                    "upload_url": upload_url,
                    "key": object_key,
                    "resume_id": resume_id,
                }
            ),
        }

    except Exception as error:
        return {
            "statusCode": 500,
            "headers": _cors_headers(),
            "body": json.dumps({"message": "Failed to generate upload URL", "error": str(error)}),
        }
