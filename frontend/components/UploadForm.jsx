'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { FileUp, Loader2 } from 'lucide-react';

import { getUploadUrl, uploadPdfToS3 } from '../lib/api';

export default function UploadForm() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onDrop = (acceptedFiles) => {
    // Merge new files while avoiding duplicate names in the upload list.
    const merged = [...files, ...acceptedFiles];
    const uniqueByName = Array.from(new Map(merged.map((f) => [f.name, f])).values());
    setFiles(uniqueByName);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  });

  const isActionDisabled = useMemo(() => {
    return isUploading || files.length === 0 || jobDescription.trim().length < 20;
  }, [files.length, isUploading, jobDescription]);

  const handleUpload = async () => {
    setErrorMessage('');

    if (files.length === 0) {
      setErrorMessage('Please upload at least one PDF resume.');
      return;
    }

    if (jobDescription.trim().length < 20) {
      setErrorMessage('Please provide a detailed job description (minimum 20 characters).');
      return;
    }

    setIsUploading(true);

    try {
      // Upload all PDFs concurrently for faster processing across multiple files.
      await Promise.all(
        files.map(async (file) => {
          const payload = await getUploadUrl(file.name, jobDescription.trim());
          const putUrl = payload?.upload_url;

          // Stop early with a clear error if backend did not return a presigned URL.
          if (!putUrl) {
            const backendMessage = payload?.message || 'Upload URL was not returned by API.';
            throw new Error(backendMessage);
          }

          await uploadPdfToS3(putUrl, file, (percent) => {
            setUploadProgress((prev) => ({ ...prev, [file.name]: percent }));
          });

          // Ensure UI shows complete progress once PUT succeeds.
          setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
        })
      );

      // Navigate to the live results dashboard after all uploads finish.
      router.push('/results');
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          'Upload failed. Please verify API settings and try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="panel p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.12em] text-mist">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            rows={8}
            placeholder="Paste the full job description here. Include required skills, years of experience, responsibilities, and preferred qualifications for best screening quality."
            className="soft-scrollbar w-full rounded-xl border border-slate-600 bg-slate-800/70 p-4 text-sm text-slate-100 outline-none transition focus:border-glow focus:ring-2 focus:ring-glow/40"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.12em] text-mist">
            Resume PDFs
          </label>
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
              isDragActive
                ? 'border-glow bg-glow/10'
                : 'border-slate-500 bg-slate-800/50 hover:border-slate-300'
            }`}
          >
            <input {...getInputProps()} />
            <FileUp className="mx-auto mb-4 h-10 w-10 text-glow" />
            <p className="text-sm text-slate-200">
              {isDragActive
                ? 'Drop your PDFs here...'
                : 'Drag and drop one or more PDF resumes, or click to browse'}
            </p>
            <p className="mt-2 text-xs text-slate-400">Only .pdf files are accepted</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.name} className="rounded-xl border border-slate-700 bg-slate-800/40 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                  <span className="truncate pr-4">{file.name}</span>
                  <span>{uploadProgress[file.name] || 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-700">
                  <div
                    className="h-2 rounded-full bg-glow transition-all duration-300"
                    style={{ width: `${uploadProgress[file.name] || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-rose/40 bg-rose/20 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={isActionDisabled}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-glow to-cyan-300 px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
        >
          {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isUploading ? 'Uploading Resumes...' : 'Screen Resumes'}
        </button>
      </div>
    </section>
  );
}
