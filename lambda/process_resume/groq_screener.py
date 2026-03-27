import json
import os
from typing import Any, Dict

from groq import Groq


_client = None


def _get_client() -> Groq:
    """Create/reuse Groq client while validating required API credentials."""
    global _client
    if _client is not None:
        return _client

    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set in Lambda environment variables.")

    _client = Groq(api_key=api_key)
    return _client


class GroqJSONParseError(Exception):
    """Raised when Groq returns text that is not valid JSON."""

    def __init__(self, message: str, raw_response: str):
        super().__init__(message)
        self.raw_response = raw_response


def screen_resume(job_description: str, resume_text: str) -> Dict[str, Any]:
    """Send the resume and job description to Groq and parse strict JSON output."""
    client = _get_client()
    completion = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": "You are an expert HR recruiter and resume analyst."
            },
            {
                "role": "user",
                "content": f"""
You will be given a Job Description and a Resume.
Analyze the resume strictly against the job description.

Job Description:
{job_description}

Resume Text:
{resume_text}

Return ONLY a valid JSON object (no markdown, no explanation) with this
exact structure:
{{
  "score": <integer 0-100>,
  "recommendation": "<Shortlist | Maybe | Reject>",
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<point 1>", "<point 2>", "<point 3>"],
  "weaknesses": ["<point 1>", "<point 2>", "<point 3>"],
  "skill_match": ["<matched skill 1>", "<matched skill 2>"],
  "missing_skills": ["<missing skill 1>", "<missing skill 2>"]
}}
"""
            }
        ],
        temperature=0.2,
        max_tokens=1024,
        top_p=1,
        stream=False,
        stop=None
    )

    # Parse the model's text output into JSON for downstream storage.
    result_text = completion.choices[0].message.content
    try:
        return json.loads(result_text)
    except json.JSONDecodeError as error:
        raise GroqJSONParseError(f"Groq returned invalid JSON: {error}", result_text) from error
