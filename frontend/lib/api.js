import axios from 'axios';

// Build all API requests from environment variable base URL.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  // This warning helps diagnose misconfigured frontend environments quickly.
  // eslint-disable-next-line no-console
  console.warn('NEXT_PUBLIC_API_BASE_URL is not set. API calls will fail.');
}

export async function getUploadUrl(filename, jobDescription) {
  // Request a presigned upload URL for a specific PDF.
  const response = await axios.post(
    `${API_BASE_URL}/get-upload-url`,
    {
      filename,
      job_description: jobDescription
    },
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );

  return response.data;
}

export async function uploadPdfToS3(uploadUrl, file, onProgress) {
  // Upload binary file content directly from browser to S3.
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': 'application/pdf' },
    onUploadProgress: (event) => {
      if (!event.total) return;
      const percent = Math.round((event.loaded * 100) / event.total);
      onProgress(percent);
    }
  });
}

export async function getResults() {
  // Fetch screening results list for dashboard rendering.
  const response = await axios.get(`${API_BASE_URL}/results`, {
    headers: { 'Content-Type': 'application/json' }
  });
  return response.data;
}
