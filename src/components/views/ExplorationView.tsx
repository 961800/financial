import React, { useRef, useState } from 'react';
import { Search, Upload } from 'lucide-react';
import { ExplorationResponse } from '../../types/analytics';
import { KpiCard } from '../KpiCard';

interface ExplorationViewProps {
  data: ExplorationResponse | null;
  loading: boolean;
  onUploadCsvFile: (file: File) => void;
}

export const ExplorationView: React.FC<ExplorationViewProps> = ({
  data,
  loading,
  onUploadCsvFile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const pageSize = 10;

  if (loading || !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-500">
        Loading dataset exploration profile...
      </div>
    );
  }

  const { summary, columns, previewRows } = data;
  const headers = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  const filteredRows = previewRows.filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return Object.values(row).some((val) => String(val).toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleRows = filteredRows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const numericColumns = columns.filter((c) => c.inferredType === 'numeric' && c.numericStats);
  const categoricalColumns = columns.filter((c) => c.inferredType !== 'numeric');

  return (
    <div className="space-y-6">
      {/* Upload Dropzone Bar */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Upload Bank Marketing CSV</h2>
          <p className="text-xs text-slate-500 mt-1">
            Supports UCI semicolon (`;`) or standard comma (`,`) CSVs. Automatically detects target column `y` (yes/no).
          </p>
        </div>
        <div className="shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadCsvFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#163A66] rounded-md transition-colors whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span>Choose CSV File</span>
          </button>
        </div>
      </section>

      {/* Shape & Quality KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Rows" value={summary.rowCount.toLocaleString()} subtext={`Raw count: ${summary.rawRowCount.toLocaleString()}`} />
        <KpiCard label="Total Columns" value={summary.columnCount} subtext={`Target column: ${summary.targetColumn}`} accent="blue" />
        <KpiCard label="Missing / 'unknown' Tokens" value={`${summary.totalMissingCount} / ${summary.totalUnknownCount.toLocaleString()}`} subtext="Null cells / 'unknown' labels" />
        <KpiCard label="Duplicate Records" value={summary.duplicateCount.toLocaleString()} subtext={summary.duplicateCount === 0 ? 'Zero exact duplicates' : 'Removable in Data Cleaning'} accent="emerald" />
      </section>

      {/* Dataset Preview Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Dataset Preview (First 50 Records)</h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Showing {visibleRows.length} of {filteredRows.length} preview rows
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              placeholder="Filter preview rows..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-sky-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-3 py-2.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/80">
                  {headers.map((h) => (
                    <td
                      key={h}
                      className={`px-3 py-2 whitespace-nowrap ${
                        typeof row[h] === 'number' ? 'font-mono tabular-nums text-slate-800' : 'text-slate-700'
                      }`}
                    >
                      {String(row[h])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="tabular-nums">
            Page {safePage + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Column Schema & Data Quality */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Column Schema, Data Types & Missingness</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-2.5">Column Name</th>
                <th className="px-4 py-2.5">Inferred Type</th>
                <th className="px-4 py-2.5 text-right">Null / Missing</th>
                <th className="px-4 py-2.5 text-right">'unknown' Count</th>
                <th className="px-4 py-2.5 text-right">Unique Values</th>
                <th className="px-4 py-2.5">Sample Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {columns.map((col) => (
                <tr key={col.name} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{col.name}</td>
                  <td className="px-4 py-2.5 text-slate-600 capitalize">{col.inferredType}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">{col.missingCount}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">{col.unknownCount.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">{col.uniqueCount.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-slate-500 truncate max-w-xs">{col.sampleValues.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Statistical Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Numeric Statistical Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3 py-2.5">Feature</th>
                  <th className="px-3 py-2.5 text-right">Min</th>
                  <th className="px-3 py-2.5 text-right">Median</th>
                  <th className="px-3 py-2.5 text-right">Mean</th>
                  <th className="px-3 py-2.5 text-right">Std</th>
                  <th className="px-3 py-2.5 text-right">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {numericColumns.map((col) => (
                  <tr key={col.name} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5 font-medium text-slate-900">{col.name}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{col.numericStats!.min}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{col.numericStats!.median}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{col.numericStats!.mean}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{col.numericStats!.std}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{col.numericStats!.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Categorical Top Frequencies</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3 py-2.5">Feature</th>
                  <th className="px-3 py-2.5">Top Category</th>
                  <th className="px-3 py-2.5 text-right">Top Share</th>
                  <th className="px-3 py-2.5 text-right">Unique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoricalColumns.map((col) => {
                  const top = col.categoricalTop?.[0];
                  return (
                    <tr key={col.name} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2.5 font-medium text-slate-900">{col.name}</td>
                      <td className="px-3 py-2.5 text-slate-700">{top ? top.value : '-'}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {top ? `${top.count.toLocaleString()} (${top.pct}%)` : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">{col.uniqueCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
