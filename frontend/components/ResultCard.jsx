'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import ScoreBadge from './ScoreBadge';
import SkillTags from './SkillTags';

function recommendationClass(recommendation) {
  if (recommendation === 'Shortlist') return 'bg-mint/20 text-mint border-mint/50';
  if (recommendation === 'Maybe') return 'bg-amber/20 text-amber border-amber/50';
  return 'bg-rose/20 text-rose border-rose/50';
}

export default function ResultCard({ item }) {
  // Toggle full details to keep dashboard compact by default.
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="panel overflow-hidden transition hover:-translate-y-0.5 hover:border-slate-500">
      <div className="grid gap-6 p-6 md:grid-cols-[auto,1fr,auto] md:items-center">
        <ScoreBadge score={item.score} />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-white">{item.resume_name}</h3>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${recommendationClass(
                item.recommendation
              )}`}
            >
              {item.recommendation}
            </span>
            <span className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300">
              {item.status}
            </span>
          </div>
          <p className="max-w-3xl text-sm text-slate-300">{item.summary}</p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700/40 px-4 py-2 text-sm text-slate-100 transition hover:border-slate-400"
        >
          {expanded ? 'Hide Details' : 'View Details'}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden border-t border-slate-700/70`}
      >
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-mist">Strengths</h4>
            <ul className="space-y-2 text-sm text-slate-200">
              {(item.strengths || []).map((point, idx) => (
                <li key={`str-${idx}`} className="rounded-lg border border-mint/30 bg-mint/10 p-3">
                  <span className="mr-2">✅</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-mist">Weaknesses</h4>
            <ul className="space-y-2 text-sm text-slate-200">
              {(item.weaknesses || []).map((point, idx) => (
                <li key={`weak-${idx}`} className="rounded-lg border border-rose/30 bg-rose/10 p-3">
                  <span className="mr-2">❌</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-6 border-t border-slate-700/70 p-6 md:grid-cols-2">
          <SkillTags title="Skill Match" items={item.skill_match} type="match" />
          <SkillTags title="Missing Skills" items={item.missing_skills} type="missing" />
        </div>
      </div>
    </article>
  );
}
