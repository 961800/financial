import React, { useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { CleaningConfig, CleaningResult, DatasetSummary } from '../../types/analytics';
import { KpiCard } from '../KpiCard';

interface CleaningViewProps {
  summary: DatasetSummary | null;
  cleaningResult: CleaningResult | null;
  applying: boolean;
  onApplyCleaning: (config: CleaningConfig) => void;
  onResetCleaning: () => void;
}

const OUTLIER_CANDIDATES = ['age', 'balance', 'duration', 'campaign'];

export const CleaningView: React.FC<CleaningViewProps> = ({
  summary,
  cleaningResult,
  applying,
  onApplyCleaning,
  onResetCleaning,
}) => {
  const [missingStrategy, setMissingStrategy] = useState<CleaningConfig['missingStrategy']>('mode');
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [outlierStrategy, setOutlierStrategy] = useState<CleaningConfig['outlierStrategy']>('iqr_cap');
  const [outlierColumns, setOutlierColumns] = useState<string[]>(['age', 'balance', 'duration', 'campaign']);

  const toggleOutlierCol = (col: string) => {
    setOutlierColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleApply = () => {
    onApplyCleaning({
      missingStrategy,
      removeDuplicates,
      outlierStrategy,
      outlierColumns,
      encodePreviewLimit: 10,
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Configure Data Cleaning Pipeline</h2>
            <p className="text-xs text-slate-500 mt-1">
              Treat missing / `'unknown'` values, remove duplicate records, winsorize IQR outliers, and inspect encoded features.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {summary?.isCleaned && (
              <button
                type="button"
                disabled={applying}
                onClick={onResetCleaning}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Raw</span>
              </button>
            )}
            <a
              href="/api/dataset/cleaned-csv"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-sky-700 border border-sky-200 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              1. Missing &amp; 'unknown' Token Strategy
            </label>
            <select
              value={missingStrategy}
              onChange={(e) => setMissingStrategy(e.target.value as CleaningConfig['missingStrategy'])}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-600"
            >
              <option value="mode">Mode Imputation (Replace 'unknown' in profile fields)</option>
              <option value="keep_unknown">Retain 'unknown' as Distinct Category</option>
              <option value="drop_rows">Drop Rows Containing 'unknown' Profile Fields</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-500">
              Preserves `poutcome='unknown'` as meaningful prior-contact absence.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              2. Outlier Handling (1.5 × IQR Fences)
            </label>
            <select
              value={outlierStrategy}
              onChange={(e) => setOutlierStrategy(e.target.value as CleaningConfig['outlierStrategy'])}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-600"
            >
              <option value="iqr_cap">Cap Outliers at IQR Fences (Winsorization)</option>
              <option value="iqr_remove">Remove Rows Outside IQR Fences</option>
              <option value="none">Keep Raw Numeric Distribution</option>
            </select>
            <div className="mt-2.5 flex flex-wrap gap-3">
              {OUTLIER_CANDIDATES.map((col) => (
                <label key={col} className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outlierColumns.includes(col)}
                    onChange={() => toggleOutlierCol(col)}
                    className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                  />
                  <span>{col}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              3. Deduplication &amp; Execution
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={removeDuplicates}
                onChange={(e) => setRemoveDuplicates(e.target.checked)}
                className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
              />
              <span>Remove exact duplicate customer records</span>
            </label>
            <button
              type="button"
              disabled={applying}
              onClick={handleApply}
              className="mt-3 w-full px-4 py-2.5 text-sm font-medium text-white bg-[#0F294A] hover:bg-[#163A66] rounded-md transition-colors disabled:opacity-50"
            >
              {applying ? 'Applying Pipeline...' : 'Apply Cleaning Pipeline'}
            </button>
          </div>
        </div>
      </section>

      {/* Cleaning Audit Results */}
      {cleaningResult ? (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Rows Retained"
              value={`${cleaningResult.afterRows.toLocaleString()}`}
              subtext={`From ${cleaningResult.beforeRows.toLocaleString()} raw records`}
            />
            <KpiCard
              label="Duplicates Removed"
              value={cleaningResult.duplicatesRemoved.toLocaleString()}
              subtext="Exact duplicate rows eliminated"
              accent="blue"
            />
            <KpiCard
              label="Missing / 'unknown' Treated"
              value={cleaningResult.missingImputedOrDropped.toLocaleString()}
              subtext={`Strategy: ${cleaningResult.summary.lastCleaningConfig?.missingStrategy || missingStrategy}`}
            />
            <KpiCard
              label="Outlier Values Treated"
              value={cleaningResult.outliersHandled.toLocaleString()}
              subtext={`Strategy: ${outlierStrategy}`}
              accent="emerald"
            />
          </section>

          {cleaningResult.outlierDetails.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">IQR Outlier Treatment Audit</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Feature</th>
                      <th className="px-4 py-2.5 text-right">Q1</th>
                      <th className="px-4 py-2.5 text-right">Q3</th>
                      <th className="px-4 py-2.5 text-right">IQR</th>
                      <th className="px-4 py-2.5 text-right">Fence [Low, High]</th>
                      <th className="px-4 py-2.5 text-right">Outliers</th>
                      <th className="px-4 py-2.5 text-right">Before [Min, Max]</th>
                      <th className="px-4 py-2.5 text-right">After [Min, Max]</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cleaningResult.outlierDetails.map((d) => (
                      <tr key={d.column} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{d.column}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">{d.q1}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">{d.q3}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">{d.iqr}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          [{d.lowerFence}, {d.upperFence}]
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-sky-700 font-medium">
                          {d.outlierCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500">
                          [{d.beforeMin}, {d.beforeMax}]
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900">
                          [{d.afterMin}, {d.afterMax}]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Categorical Encoding Preview */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Encoded Feature Matrix Preview (Binary &amp; One-Hot Encoding)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Previewing numeric scaling inputs alongside binary (`0`/`1`) and one-hot encoded indicators prepared for Scikit-learn / ML pipelines.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    {cleaningResult.encodedFeatureNames.map((col) => (
                      <th key={col} className="px-3 py-2.5 whitespace-nowrap font-mono">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cleaningResult.encodedPreviewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      {cleaningResult.encodedFeatureNames.map((col) => (
                        <td key={col} className="px-3 py-2 text-right font-mono tabular-nums text-slate-800">
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="bg-white border border-slate-200 rounded-lg p-6 text-sm text-slate-600">
          Select your cleaning rules above and click <strong>Apply Cleaning Pipeline</strong> to execute imputation,
          deduplication, and IQR outlier handling across the active dataset. All downstream EDA, Dashboard, and ML modules
          will automatically reflect the cleaned dataset.
        </section>
      )}
    </div>
  );
};
