import React from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: 'navy' | 'blue' | 'emerald' | 'slate';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  accent = 'navy',
}) => {
  const valueColor =
    accent === 'blue'
      ? 'text-sky-700'
      : accent === 'emerald'
      ? 'text-emerald-700'
      : 'text-slate-900';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <p className="text-xs font-medium text-slate-500 tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-semibold font-display tabular-nums ${valueColor}`}>
        {value}
      </p>
      {subtext && (
        <p className="mt-1.5 text-xs text-slate-500 tabular-nums">{subtext}</p>
      )}
    </div>
  );
};
