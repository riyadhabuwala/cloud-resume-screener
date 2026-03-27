export default function SkillTags({ title, items = [], type = 'match' }) {
  // Switch visual style between matched and missing skill chips.
  const chipStyle =
    type === 'match'
      ? 'bg-sky-500/20 text-sky-200 border-sky-400/30'
      : 'bg-slate-700/60 text-slate-200 border-slate-500/50';

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-mist">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300">None</span>
        ) : (
          items.map((item, idx) => (
            <span
              key={`${item}-${idx}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${chipStyle}`}
            >
              {item}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
