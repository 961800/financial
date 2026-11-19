import React from 'react';
import {
  BarChart3,
  BrainCircuit,
  CheckSquare,
  Database,
  FileText,
  Home,
  LayoutDashboard,
  Lightbulb,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import { DatasetSummary, ModuleKey } from '../types/analytics';

interface SidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (key: ModuleKey) => void;
  summary: DatasetSummary | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { key: ModuleKey; index: string; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'home', index: '01', label: 'Project Overview', icon: Home },
  { key: 'exploration', index: '02', label: 'Dataset Exploration', icon: Database },
  { key: 'cleaning', index: '03', label: 'Data Cleaning', icon: CheckSquare },
  { key: 'eda', index: '04', label: 'Exploratory Analysis', icon: BarChart3 },
  { key: 'performance', index: '05', label: 'Campaign Performance', icon: TrendingUp },
  { key: 'ml', index: '06', label: 'ML Model Comparison', icon: BrainCircuit },
  { key: 'prediction', index: '07', label: 'Customer Prediction', icon: Target },
  { key: 'dashboard', index: '08', label: 'Executive Dashboard', icon: LayoutDashboard },
  { key: 'insights', index: '09', label: 'Business Insights', icon: Lightbulb },
  { key: 'report', index: '10', label: 'Project Report', icon: FileText },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  summary,
  mobileOpen,
  onCloseMobile,
}) => {
  const content = (
    <div className="flex flex-col h-full bg-[#0A192F] text-slate-100 select-none">
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800/80">
        <div>
          <span className="font-display text-base font-semibold tracking-tight text-white block">
            FinSight Analytics
          </span>
          <span className="text-xs text-sky-300/80 block mt-0.5">
            Term Deposit Intelligence
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onSelectModule(item.key);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left ${
                isActive
                  ? 'bg-sky-600/20 text-white font-medium border border-sky-500/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
              <span className="truncate whitespace-nowrap">
                {item.index}. {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {summary && (
        <div className="px-5 py-4 border-t border-slate-800/80 text-xs text-slate-300 space-y-1.5">
          <p className="text-slate-400 font-medium">Active Dataset</p>
          <p className="text-white font-medium truncate" title={summary.datasetName}>
            {summary.datasetName}
          </p>
          <p className="text-slate-400 tabular-nums">
            {summary.rowCount.toLocaleString()} rows · {summary.columnCount} cols · {summary.conversionRate}% yes
          </p>
          <p className="text-sky-300/90">
            {summary.isCleaned ? 'Cleaned dataset active' : 'Raw dataset active'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 bg-[#0A192F] min-h-screen sticky top-0 h-screen">
        {content}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full">{content}</div>
          <div
            className="flex-1 bg-slate-900/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
        </div>
      )}
    </>
  );
};
