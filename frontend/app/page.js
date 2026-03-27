import UploadForm from '../components/UploadForm';

export default function HomePage() {
  // Render hero content and the upload workflow entry point.
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:py-16">
      <section className="mb-8 space-y-4 text-center md:mb-12">
        <span className="inline-block rounded-full border border-glow/40 bg-glow/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-glow">
          Talent Intelligence Platform
        </span>
        <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
          AI Resume Screener
        </h1>
        <p className="mx-auto max-w-3xl text-sm text-slate-300 md:text-base">
          Instantly evaluate one or many resumes against your job description using Groq-powered
          analysis, then review ranked candidates on a live scoring dashboard.
        </p>
      </section>

      <UploadForm />
    </main>
  );
}
