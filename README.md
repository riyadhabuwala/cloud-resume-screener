# AI Resume Screener

End-to-end cloud application that screens uploaded PDF resumes against a job description using Groq AI, then displays ranked results in a modern Next.js dashboard.

## Architecture Diagram

See `architecture.png` for a visual diagram.

```text
+--------------------+         POST /get-upload-url         +------------------------+
|   Next.js Frontend | ------------------------------------> | API Gateway (REST API) |
| (Vercel Deployment)|                                       +-----------+------------+
+----------+---------+                                                   |
           |                                                             v
           |                                      +----------------------+----------------------+
           |                                      | Lambda: get_upload_url (Python 3.11)       |
           |                                      | - validates request                          |
           |                                      | - creates resume_id (uuid4)                 |
           |                                      | - creates S3 presigned PUT URL              |
           |                                      | - stores initial record in DynamoDB         |
           |                                      +----------------------+----------------------+
           |                                                             |
           |                     PUT PDF to presigned URL                v
           +-------------------------------------------------> +---------+---------+
                                                              |  S3 Bucket         |
                                                              |  resumes/*         |
                                                              +---------+---------+
                                                                        |
                                                                        | S3 PUT Trigger
                                                                        v
                                             +--------------------------+---------------------------+
                                             | Lambda: process_resume (Python 3.11)                |
                                             | - downloads PDF from S3                              |
                                             | - extracts text via PyMuPDF                          |
                                             | - calls Groq model: openai/gpt-oss-120b             |
                                             | - parses strict JSON response                        |
                                             | - stores completed/failed result in DynamoDB        |
                                             +--------------------------+---------------------------+
                                                                        |
                                                                        v
                                                              +---------+---------+
                                                              | DynamoDB Table    |
                                                              | ResumeResults     |
                                                              +---------+---------+
                                                                        ^
                                                                        |
                          GET /results                                 |
+--------------------+  ------------------------------------+----------+----------+
|   Next.js Frontend |                                      | Lambda: get_results |
+--------------------+                                      | scans + sorts scores |
                                                            +----------------------+
```

## Features
- Multi-file PDF upload with drag-and-drop and per-file progress bars
- Direct browser-to-S3 upload via presigned URLs (no large file API gateway payloads)
- Automatic S3-triggered resume processing pipeline
- Resume text extraction with PyMuPDF in Lambda
- AI screening via Groq API (`openai/gpt-oss-120b`, `stream=False`)
- Structured scoring output: score, recommendation, summary, strengths, weaknesses, matched/missing skills
- DynamoDB persistence with status tracking (`processing`, `completed`, `failed`)
- Live polling dashboard (every 5 seconds) with sortable, expandable result cards
- Responsive dark-mode SaaS UI built with Next.js 14 + Tailwind CSS

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, Axios, react-dropzone, lucide-react |
| Backend | AWS Lambda (Python 3.11) |
| Storage | Amazon S3 (resume PDFs), Amazon DynamoDB (`ResumeResults`) |
| API | Amazon API Gateway (REST) |
| AI | Groq Python SDK using model `openai/gpt-oss-120b` |
| PDF Parsing | PyMuPDF (`fitz`) |
| Deployment | Vercel (frontend), AWS (backend) |

## Local Setup
1. Clone/download this repository.
2. Configure backend dependencies per Lambda folder:

```bash
cd lambda/process_resume
pip install -r requirements.txt
cd ../get_results
pip install -r requirements.txt
cd ../get_upload_url
pip install -r requirements.txt
```

3. Configure frontend environment:

```bash
cd frontend
cp .env.local.example .env.local
```

4. Update `.env.local`:
- `NEXT_PUBLIC_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod`

5. Install and run frontend:

```bash
npm install
npm run dev
```

6. Open `http://localhost:3000`.

## AWS Deployment Steps
1. Create S3 bucket and DynamoDB table (`ResumeResults`).
2. Create Lambdas (`process_resume`, `get_results`, `get_upload_url`) on Python 3.11.
3. Set environment variables exactly as listed in this README.
4. Add S3 PUT trigger (`resumes/`) to `process_resume`.
5. Create REST API routes:
- `GET /results` -> `get_results`
- `POST /get-upload-url` -> `get_upload_url`
6. Enable CORS on both routes.
7. Package and upload Lambda ZIPs.
8. Deploy API Gateway stage (e.g., `prod`).

### Lambda Packaging Commands

macOS/Linux:

```bash
cd lambda/process_resume
pip install -r requirements.txt -t .
zip -r process_resume.zip .

cd ../get_results
pip install -r requirements.txt -t .
zip -r get_results.zip .

cd ../get_upload_url
pip install -r requirements.txt -t .
zip -r get_upload_url.zip .
```

Windows PowerShell:

```powershell
Set-Location lambda/process_resume
pip install -r requirements.txt -t .
Compress-Archive -Path * -DestinationPath process_resume.zip -Force

Set-Location ../get_results
pip install -r requirements.txt -t .
Compress-Archive -Path * -DestinationPath get_results.zip -Force

Set-Location ../get_upload_url
pip install -r requirements.txt -t .
Compress-Archive -Path * -DestinationPath get_upload_url.zip -Force
```

### IAM Permissions
Create and attach a Lambda execution role with:
- S3: `GetObject`, `PutObject` on the upload bucket
- DynamoDB: `PutItem`, `GetItem`, `Scan` on `ResumeResults`
- CloudWatch Logs: `CreateLogGroup`, `CreateLogStream`, `PutLogEvents`
- `get_upload_url` requires S3 access used for presigned URL generation

## Vercel Deployment Steps
1. Push repository to Git provider.
2. Import `frontend` project in Vercel.
3. Add environment variable:
- `NEXT_PUBLIC_API_BASE_URL`
4. Deploy.
5. Confirm frontend can call API Gateway endpoints.

## Environment Variables

| Scope | Variable | Example |
|---|---|---|
| process_resume Lambda | `GROQ_API_KEY` | `gsk_xxxxxxxxxxxx` |
| process_resume Lambda | `JOB_DESCRIPTION` | `Senior backend engineer ...` |
| process_resume Lambda | `DYNAMODB_TABLE` | `ResumeResults` |
| process_resume Lambda | `S3_BUCKET` | `resume-screener-bucket` |
| process_resume Lambda | `AWS_REGION_NAME` | `us-east-1` |
| get_results Lambda | `DYNAMODB_TABLE` | `ResumeResults` |
| get_results Lambda | `AWS_REGION` | `us-east-1` |
| get_upload_url Lambda | `DYNAMODB_TABLE` | `ResumeResults` |
| get_upload_url Lambda | `S3_BUCKET` | `resume-screener-bucket` |
| get_upload_url Lambda | `AWS_REGION_NAME` | `us-east-1` |
| Frontend | `NEXT_PUBLIC_API_BASE_URL` | `https://your-api-gateway-url.amazonaws.com/prod` |

## How It Works
1. User enters a job description and uploads one or more PDF resumes in the frontend.
2. Frontend requests a presigned URL from `POST /get-upload-url` for each file.
3. Frontend uploads each PDF directly to S3 using presigned PUT URLs.
4. S3 PUT event triggers `process_resume` Lambda.
5. Lambda downloads PDF, extracts text via PyMuPDF, and sends JD + resume text to Groq.
6. Lambda stores screening results in DynamoDB with status and structured fields.
7. Results page polls `GET /results` every 5 seconds and renders ranked cards.

## Screenshots
- Home Upload UI: `docs/screenshots/home.png` (add after deployment)
- Results Dashboard: `docs/screenshots/results.png` (add after deployment)

## Free Tier Cost Breakdown (Approx. $0 for low usage)
- AWS Lambda: Within free monthly request/compute limits
- Amazon S3: Small-volume PDF storage within free tier
- DynamoDB: On-demand low reads/writes within free allocation
- API Gateway: Low request volume within free tier allocation
- Vercel Hobby: Free tier suitable for this project

> Groq API usage may have separate pricing/credits depending on your account plan.

## License
MIT
