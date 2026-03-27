import json
import logging
import os
import tempfile
from typing import Any, Dict

import boto3

from dynamo_helper import build_failed_item, get_resume_item, now_iso, put_result
from groq_screener import GroqJSONParseError, screen_resume
from pdf_extractor import extract_text_from_pdf


# Reuse the S3 client across invocations.
s3_client = boto3.client("s3", region_name=os.environ.get("AWS_REGION_NAME", "us-east-1"))
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def _extract_resume_identity(object_key: str) -> Dict[str, str]:
    """Parse resume_id and filename from an S3 key like resumes/<uuid>_<filename>."""
    key_name = object_key.split("/")[-1]
    if "_" in key_name:
        resume_id, resume_name = key_name.split("_", 1)
    else:
        # Fallback when the key format is unexpected.
        resume_id = key_name
        resume_name = key_name
    return {"resume_id": resume_id, "resume_name": resume_name}


def _normalize_result(
    resume_id: str,
    resume_name: str,
    uploaded_at: str,
    model_output: Dict[str, Any]
) -> Dict[str, Any]:
    """Normalize model output into a stable DynamoDB item schema."""
    return {
        "resume_id": resume_id,
        "resume_name": resume_name,
        "score": int(model_output.get("score", 0)),
        "recommendation": str(model_output.get("recommendation", "Maybe")),
        "summary": str(model_output.get("summary", "")),
        "strengths": model_output.get("strengths", []) or [],
        "weaknesses": model_output.get("weaknesses", []) or [],
        "skill_match": model_output.get("skill_match", []) or [],
        "missing_skills": model_output.get("missing_skills", []) or [],
        "uploaded_at": uploaded_at,
        "status": "completed",
    }


def lambda_handler(event, context):
    """Handle S3 PUT events, screen uploaded resumes, and persist results."""
    records = event.get("Records", [])
    logger.info("process_resume invoked with %s record(s)", len(records))

    for record in records:
        s3_info = record.get("s3", {})
        bucket_name = s3_info.get("bucket", {}).get("name")
        object_key = s3_info.get("object", {}).get("key")

        if not bucket_name or not object_key:
            # Skip malformed records without crashing the whole batch.
            continue

        identity = _extract_resume_identity(object_key)
        resume_id = identity["resume_id"]
        resume_name = identity["resume_name"]
        logger.info("Processing resume_id=%s object_key=%s", resume_id, object_key)

        existing = get_resume_item(resume_id) or {}
        uploaded_at = existing.get("uploaded_at", now_iso())

        # Prefer per-upload job description from DynamoDB; fallback to env variable.
        job_description = (
            existing.get("job_description")
            or os.environ.get("JOB_DESCRIPTION", "")
        )

        temp_file_path = None
        try:
            # Download the uploaded PDF into Lambda's temporary storage.
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                temp_file_path = temp_file.name

            s3_client.download_file(bucket_name, object_key, temp_file_path)

            # Extract all textual content from the PDF.
            resume_text = extract_text_from_pdf(temp_file_path)
            if not resume_text:
                raise ValueError("No text could be extracted from the PDF.")

            # Execute one model call; failures are captured below and persisted.
            model_output = screen_resume(job_description, resume_text)

            result_item = _normalize_result(
                resume_id=resume_id,
                resume_name=resume_name,
                uploaded_at=uploaded_at,
                model_output=model_output,
            )
            put_result(result_item)
            logger.info("Completed screening resume_id=%s", resume_id)

        except GroqJSONParseError as decode_error:
            # Persist raw model output text when JSON parsing fails.
            failed_item = build_failed_item(
                resume_id=resume_id,
                resume_name=resume_name,
                error_message=f"JSON parsing failed: {decode_error}",
                uploaded_at=uploaded_at,
                raw_response=decode_error.raw_response,
            )
            put_result(failed_item)
            logger.exception("Groq JSON parsing failed for resume_id=%s", resume_id)

        except Exception as error:
            # Persist extraction/API/general failures with consistent schema.
            failed_item = build_failed_item(
                resume_id=resume_id,
                resume_name=resume_name,
                error_message=str(error),
                uploaded_at=uploaded_at,
            )
            put_result(failed_item)
            logger.exception("Resume screening failed for resume_id=%s", resume_id)

        finally:
            # Clean up temporary file storage to avoid filling /tmp.
            if temp_file_path and os.path.exists(temp_file_path):
                os.remove(temp_file_path)

    # Return a simple batch-processing response for CloudWatch visibility.
    logger.info("process_resume finished")
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Processed S3 event batch."})
    }
