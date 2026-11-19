import React, { useRef } from 'react';
import { Menu, Upload } from 'lucide-react';
import { DatasetSummary, ModuleKey } from '../types/analytics';

interface TopBarProps {
  activeModule: ModuleKey;
  summary: DatasetSummary | null;
  onOpenMobile: () => void;
  onUploadCsvFile: (file: File) => void;
  uploading: boolean;
}

const MODULE_TITLES: Record<ModuleKey, string> = {
  home: 'Project Overview',
  exploration: 'Dataset Exploration',
  cleaning: 'Data Cleaning & Preparation',
  eda: 'Exploratory Data Analysis',
  performance: 'Campaign Performance Analysis',
  ml: 'Machine Learning Prediction',
  prediction: 'Customer Subscription Prediction',
  dashboard: 'Interactive Executive Dashboard',
  insights: 'Business Insights & Recommendations',
  report: 'Academic Project Report',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeModule,
  summary,
  onOpenMobile,
  onUploadCsvFile,
  uploading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCsvFile(file);
      e.target.value = '';
    }
  };

  return (
    <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-slate-900 whitespace-nowrap truncate">
          {MODULE_TITLES[activeModule]}
        </h1>
      </div>

      {summary && (
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 tabular-nums whitespace-nowrap">
          <span>{summary.datasetName}</span>
          <span aria-hidden="true">·</span>
          <span>{summary.rowCount.toLocaleString()} records</span>
          <span aria-hidden="true">·</span>
          <span>Target: {summary.targetColumn}</span>
        </div>
      )}

      <div className="flex items-center shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#163A66] rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{uploading ? 'Uploading...' : 'Upload CSV'}</span>
        </button>
      </div>
    </header>
  );
};
