'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw } from 'lucide-react';

import ResultCard from '../../components/ResultCard';
import { getResults } from '../../lib/api';

function StatTile({ label, value }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-mist">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="panel animate-pulse p-6">
      <div className="mb-4 h-4 w-1/3 rounded bg-slate-600" />
      <div className="mb-2 h-3 w-full rounded bg-slate-700" />
      <div className="h-3 w-2/3 rounded bg-slate-700" />
    </div>
  );
}

export default function ResultsPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async (showLoader = false) => {
    if (showLoader) setLoading(true);

    try {
      setError('');
      const data = await getResults();
      setResumes(Array.isArray(data.resumes) ? data.resumes : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not fetch results. Please try again.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    // Perform initial load and then poll every 5 seconds for live updates.
    fetchData(true);
    const timer = setInterval(() => fetchData(false), 5000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const total = resumes.length;
    const shortlisted = resumes.filter((r) => r.recommendation === 'Shortlist').length;
    const maybe = resumes.filter((r) => r.recommendation === 'Maybe').length;
    const rejected = resumes.filter((r) => r.recommendation === 'Reject').length;
    return { total, shortlisted, maybe, rejected };
  }, [resumes]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">Screening Results</h1>
          <p className="mt-2 text-sm text-slate-300">Live updates every 5 seconds</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fetchData(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm text-slate-100 transition hover:border-slate-400"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            href="/"
            className="rounded-lg bg-gradient-to-r from-glow to-cyan-300 px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Upload More
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <StatTile label="Total Resumes" value={stats.total} />
        <StatTile label="Shortlisted" value={stats.shortlisted} />
        <StatTile label="Maybe" value={stats.maybe} />
        <StatTile label="Rejected" value={stats.rejected} />
      </section>

      {error && (
        <div className="rounded-lg border border-rose/40 bg-rose/20 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching latest data...
          </div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : resumes.length === 0 ? (
        <div className="panel p-10 text-center text-sm text-slate-300">
          No results yet. Upload resumes and this dashboard will update automatically.
        </div>
      ) : (
        <section className="space-y-4">
          {resumes.map((item) => (
            <ResultCard key={item.resume_id} item={item} />
          ))}
        </section>
      )}
    </main>
  );
}
