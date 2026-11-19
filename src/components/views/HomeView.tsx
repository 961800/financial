import React, { useRef } from 'react';
import { ArrowRight, Download, Upload } from 'lucide-react';
import { DatasetSummary, ModuleKey } from '../../types/analytics';
import { KpiCard } from '../KpiCard';

interface HomeViewProps {
  summary: DatasetSummary | null;
  loadingDataset: boolean;
  onLoadUci: (variant: 'sample' | 'full' | 'remote') => void;
  onUploadCsvFile: (file: File) => void;
  onNavigate: (module: ModuleKey) => void;
}

const OBJECTIVES = [
  'Analyze historical bank telemarketing records to uncover demographic, financial, and behavioral drivers of term deposit subscriptions.',
  'Evaluate outbound campaign effectiveness across occupations, age cohorts, education tiers, contact channels, and calendar months.',
  'Design a reproducible data cleaning pipeline handling unknown categorical tokens, duplicate rows, and statistical outliers.',
  'Train and benchmark Logistic Regression, Decision Tree, and Random Forest models using leakage-free preprocessing and class-imbalance weighting.',
  'Provide real-time customer propensity scoring, interactive executive filtering, and a downloadable academic project report.',
];

const TECH_STACK = [
  { name: 'Python & Streamlit', role: 'Modular Web & Replit Application (Included Export)' },
  { name: 'TypeScript & React', role: 'Interactive Banking Analytics Interface' },
  { name: 'Pandas / CSV Engine', role: 'Tabular Ingestion, Imputation & Aggregation' },
  { name: 'NumPy & Scikit-Learn', role: 'Standardization, One-Hot Encoding & ML Pipelines' },
  { name: 'Plotly / Recharts', role: 'Interactive Exploratory & Executive Visualizations' },
  { name: 'UCI Bank Dataset', role: 'Official Portuguese Banking Direct Marketing Corpus' },
];

export const HomeView: React.FC<HomeViewProps> = ({
  summary,
  loadingDataset,
  onLoadUci,
  onUploadCsvFile,
  onNavigate,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="bg-[#0A192F] text-white rounded-lg p-8 border border-slate-800">
        <p className="text-xs font-medium text-sky-300 tracking-wide">
          B.Tech Computer Science & Data Science Mini-Project · Financial Analytics
        </p>
        <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-semibold font-display tracking-tight max-w-4xl leading-tight">
          Bank Marketing Campaign Analysis Using Data Analytics and Machine Learning
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
          Retail banking institutions invest heavily in direct telemarketing campaigns to drive term deposit
          subscriptions. This system combines exploratory data analytics, segment conversion intelligence, and
          class-balanced machine learning models to identify high-propensity customers before outreach begins.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors whitespace-nowrap"
          >
            <span>Open Executive Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('ml')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
          >
            <span>Train & Compare ML Models</span>
          </button>
          <a
            href="/api/export/streamlit-zip"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-transparent hover:bg-slate-800 text-sky-300 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Download Python/Streamlit Replit Code (.zip)</span>
          </a>
        </div>
      </section>

      {/* Active Dataset Summary KPIs */}
      {summary && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Active Campaign Records"
            value={summary.rowCount.toLocaleString()}
            subtext={`${summary.columnCount} attributes · Target: "${summary.targetColumn}"`}
          />
          <KpiCard
            label="Term Deposit Subscriptions"
            value={summary.positiveCount.toLocaleString()}
            subtext={`${summary.negativeCount.toLocaleString()} non-subscriptions`}
            accent="blue"
          />
          <KpiCard
            label="Baseline Conversion Rate"
            value={`${summary.conversionRate}%`}
            subtext="Class imbalance requires weighted ML"
            accent="emerald"
          />
          <KpiCard
            label="Data Quality State"
            value={summary.isCleaned ? 'Cleaned' : 'Raw UCI'}
            subtext={`${summary.duplicateCount} duplicates · ${summary.totalUnknownCount.toLocaleString()} 'unknown' tokens`}
          />
        </section>
      )}

      {/* Dataset Source Switcher */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Dataset Source Management</h3>
            <p className="text-sm text-slate-500 mt-1">
              Switch between the bundled UCI Bank Marketing datasets, fetch live from UCI Machine Learning Repository, or upload a custom CSV.
            </p>
          </div>
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
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            disabled={loadingDataset}
            onClick={() => onLoadUci('sample')}
            className="text-left p-4 rounded-md border border-slate-200 hover:border-sky-600 hover:bg-sky-50/40 transition-colors disabled:opacity-50"
          >
            <p className="text-sm font-semibold text-slate-900">UCI Sample (bank.csv)</p>
            <p className="text-xs text-slate-500 mt-1 tabular-nums">4,521 records · 17 columns · Fast analysis</p>
          </button>

          <button
            type="button"
            disabled={loadingDataset}
            onClick={() => onLoadUci('full')}
            className="text-left p-4 rounded-md border border-slate-200 hover:border-sky-600 hover:bg-sky-50/40 transition-colors disabled:opacity-50"
          >
            <p className="text-sm font-semibold text-slate-900">UCI Full (bank-full.csv)</p>
            <p className="text-xs text-slate-500 mt-1 tabular-nums">45,211 records · 17 columns · Complete corpus</p>
          </button>

          <button
            type="button"
            disabled={loadingDataset}
            onClick={() => onLoadUci('remote')}
            className="text-left p-4 rounded-md border border-slate-200 hover:border-sky-600 hover:bg-sky-50/40 transition-colors disabled:opacity-50"
          >
            <p className="text-sm font-semibold text-slate-900">Live Fetch from UCI</p>
            <p className="text-xs text-slate-500 mt-1">Downloads directly from archive.ics.uci.edu</p>
          </button>

          <button
            type="button"
            disabled={loadingDataset}
            onClick={() => fileRef.current?.click()}
            className="text-left p-4 rounded-md border border-dashed border-sky-400 bg-sky-50/30 hover:bg-sky-50 transition-colors disabled:opacity-50"
          >
            <p className="text-sm font-semibold text-sky-800 flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              <span>Upload Custom CSV</span>
            </p>
            <p className="text-xs text-slate-600 mt-1">Auto-detects `;` / `,` delimiter & target `y`</p>
          </button>
        </div>
      </section>

      {/* Problem Statement & Objectives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-slate-900">Problem Statement</h3>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Direct telemarketing campaigns suffer from low conversion rates (typically 11%–12%) and significant
            class imbalance, leading to wasted advisor hours and customer contact fatigue. Without predictive
            lead scoring and segment attribution, banks contact low-propensity clients repeatedly while
            under-serving responsive demographics.
          </p>
          <div className="mt-5 pt-5 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-900">Analytical Methodology</h4>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Ingestion & Target Auto-Detection → Data Cleaning & IQR Outlier Treatment → Exploratory Visualization →
              Segment Conversion Profiling → Leakage-Free ML Pipelines (Logistic Regression, Decision Tree, Random Forest) →
              Propensity Inference & Academic Reporting.
            </p>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-slate-900">Project Objectives</h3>
          <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
            {OBJECTIVES.map((obj, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="font-mono text-xs font-semibold text-sky-700 mt-0.5 tabular-nums">
                  0{idx + 1}.
                </span>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Technology Stack */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-base font-semibold text-slate-900">Technology Stack & Architecture</h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TECH_STACK.map((item) => (
            <div key={item.name} className="p-4 rounded-md border border-slate-200 bg-slate-50/50">
              <p className="text-sm font-semibold text-slate-900">{item.name}</p>
              <p className="text-xs text-slate-600 mt-1">{item.role}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
