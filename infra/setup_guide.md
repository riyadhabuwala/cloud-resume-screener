# AWS Setup Guide - AI Resume Screener

## 1. Create AWS Free Tier account
1. Go to https://aws.amazon.com/free/ and create an account.
2. Sign in to AWS Console and select region `us-east-1`.

## 2. Create S3 bucket
1. Open S3 and click **Create bucket**.
2. Bucket name: `resume-screener-bucket` (or a globally unique variant).
3. Keep **Block all public access = ON**.
4. Keep **Bucket Versioning = OFF**.
5. Create bucket.

## 3. Create DynamoDB table
1. Open DynamoDB and click **Create table**.
2. Table name: `ResumeResults`.
3. Partition key: `resume_id` (String).
4. Keep defaults (on-demand capacity recommended for free-tier style usage).
5. Create table.

## 4. Create 3 Lambda functions
Create these Python 3.11 functions with Memory `512 MB` and Timeout `60 seconds`:
1. `process_resume`
2. `get_results`
3. `get_upload_url`

### IAM Role and Required Permissions
Create one IAM role for Lambda execution and attach these permissions:

- S3: `s3:GetObject`, `s3:PutObject` on your resume bucket
- DynamoDB: `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:Scan` on `ResumeResults`
- CloudWatch Logs: `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
- For `get_upload_url` Lambda: permission to generate presigned S3 URLs via the same S3 access

Attach this IAM role to all three Lambda functions.

## 5. Add S3 trigger to process_resume Lambda
1. Open `process_resume` Lambda.
2. Add trigger: **S3**.
3. Bucket: your bucket from step 2.
4. Event type: **PUT**.
5. Prefix: `resumes/`
6. Save trigger.

## 6. Create API Gateway REST API
1. Create **REST API** (not HTTP API).
2. Create route: `GET /results` integrated with `get_results` Lambda.
3. Create route: `POST /get-upload-url` integrated with `get_upload_url` Lambda.
4. Enable CORS on both routes.
5. Deploy stage (example: `prod`).

## 7. Set Lambda environment variables
Set these variables:

### process_resume
- `GROQ_API_KEY=gsk_xxxxxxxxxxxx`
- `JOB_DESCRIPTION=<fallback job description text>`
- `DYNAMODB_TABLE=ResumeResults`
- `S3_BUCKET=resume-screener-bucket`
- `AWS_REGION=us-east-1`

### get_results
- `DYNAMODB_TABLE=ResumeResults`
- `AWS_REGION_NAME=us-east-1`

### get_upload_url
- `DYNAMODB_TABLE=ResumeResults`
- `S3_BUCKET=resume-screener-bucket`
- `AWS_REGION_NAME=us-east-1`

## 8. Package and deploy Lambda ZIPs
Run from project root:

```bash
# process_resume
cd lambda/process_resume
pip install -r requirements.txt -t .
zip -r process_resume.zip .

# get_results
cd ../get_results
pip install -r requirements.txt -t .
zip -r get_results.zip .

# get_upload_url
cd ../get_upload_url
pip install -r requirements.txt -t .
zip -r get_upload_url.zip .
```

If you are on Windows PowerShell, use:

```powershell
# process_resume
Set-Location lambda/process_resume
pip install -r requirements.txt -t .
Compress-Archive -Path * -DestinationPath process_resume.zip -Force

# get_results
Set-Location ../get_results
pip install -r requirements.txt -t .
Compress-Archive -Path * -DestinationPath get_results.zip -Force

# get_upload_url
Set-Location ../get_upload_url
pip install -r requirements.txt -t .
Compress-Archive -Path * -DestinationPath get_upload_url.zip -Force
```

Upload each ZIP in its matching Lambda function under **Code source**.

## 9. Deploy frontend to Vercel
Run:

```bash
cd frontend
npm install
npm run build
npx vercel
```

In Vercel project settings, add:
- `NEXT_PUBLIC_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod`

Redeploy after saving environment variables.
