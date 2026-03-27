export default function ScoreBadge({ score = 0 }) {
  // Clamp score to a valid 0-100 range before drawing the circular gauge.
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = (safeScore / 100) * circumference;

  let color = 'text-rose stroke-rose';
  if (safeScore > 75) color = 'text-mint stroke-mint';
  else if (safeScore >= 50) color = 'text-amber stroke-amber';

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 112 112">
        <circle
          cx="56"
          cy="56"
          r={radius}
          strokeWidth="10"
          className="fill-transparent stroke-slate-600"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className={`fill-transparent transition-all duration-700 ${color}`}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute text-2xl font-bold ${color.split(' ')[0]}`}>{safeScore}</span>
    </div>
  );
}
