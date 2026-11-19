import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardFilters, DashboardResponse } from '../../types/analytics';
import { KpiCard } from '../KpiCard';

interface DashboardViewProps {
  data: DashboardResponse | null;
  filters: DashboardFilters;
  loading: boolean;
  onChangeFilters: (next: DashboardFilters) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  filters,
  loading,
  onChangeFilters,
}) => {
  if (!data) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-500">
        Loading executive dashboard...
      </div>
    );
  }

  const toggleFilter = (key: keyof DashboardFilters, value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChangeFilters({ ...filters, [key]: next });
  };

  const resetAll = () => {
    onChangeFilters({
      months: [],
      jobs: [],
      marital: [],
      education: [],
      contact: [],
      housing: [],
    });
  };

  const activeFilterCount =
    filters.months.length +
    filters.jobs.length +
    filters.marital.length +
    filters.education.length +
    filters.contact.length +
    filters.housing.length;

  const getHeatColor = (rate: number, total: number) => {
    if (total === 0) return 'bg-slate-50 text-slate-300';
    if (rate >= 30) return 'bg-[#0A192F] text-white';
    if (rate >= 20) return 'bg-[#0F294A] text-white';
    if (rate >= 14) return 'bg-sky-600 text-white';
    if (rate >= 9) return 'bg-sky-200 text-slate-900';
    return 'bg-sky-50 text-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Interactive Filter Controls */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Interactive Segment Filters
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {activeFilterCount === 0
                ? 'Showing all campaign records'
                : `${activeFilterCount} filter selections active${loading ? ' · Updating...' : ''}`}
            </p>
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Months</label>
            <div className="flex flex-wrap gap-1.5">
              {data.availableFilters.months.map((m) => {
                const active = filters.months.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleFilter('months', m)}
                    className={`px-2 py-1 rounded border text-[11px] uppercase transition-colors ${
                      active
                        ? 'bg-[#0F294A] text-white border-[#0F294A]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Occupation (Top Categories)</label>
            <div className="flex flex-wrap gap-1.5">
              {data.availableFilters.jobs.slice(0, 8).map((j) => {
                const active = filters.jobs.includes(j);
                return (
                  <button
                    key={j}
                    type="button"
                    onClick={() => toggleFilter('jobs', j)}
                    className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                      active
                        ? 'bg-[#0F294A] text-white border-[#0F294A]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {j}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Education &amp; Marital</label>
            <div className="flex flex-wrap gap-1.5">
              {data.availableFilters.education.map((ed) => {
                const active = filters.education.includes(ed);
                return (
                  <button
                    key={ed}
                    type="button"
                    onClick={() => toggleFilter('education', ed)}
                    className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                      active
                        ? 'bg-sky-700 text-white border-sky-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {ed}
                  </button>
                );
              })}
              {data.availableFilters.marital.map((mar) => {
                const active = filters.marital.includes(mar);
                return (
                  <button
                    key={mar}
                    type="button"
                    onClick={() => toggleFilter('marital', mar)}
                    className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                      active
                        ? 'bg-sky-700 text-white border-sky-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {mar}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Channel &amp; Housing Loan</label>
            <div className="flex flex-wrap gap-1.5">
              {data.availableFilters.contact.map((c) => {
                const active = filters.contact.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleFilter('contact', c)}
                    className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                      active
                        ? 'bg-[#0F294A] text-white border-[#0F294A]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
              {data.availableFilters.housing.map((h) => {
                const active = filters.housing.includes(h);
                return (
                  <button
                    key={`h-${h}`}
                    type="button"
                    onClick={() => toggleFilter('housing', h)}
                    className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                      active
                        ? 'bg-sky-700 text-white border-sky-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    housing: {h}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Customers"
          value={data.kpis.totalCustomers.toLocaleString()}
          subtext={`Avg ${data.kpis.avgCampaignContacts} contacts/customer`}
        />
        <KpiCard
          label="Successful Subscriptions"
          value={data.kpis.successfulSubscriptions.toLocaleString()}
          subtext={`${data.kpis.unsuccessfulResponses.toLocaleString()} declined`}
          accent="emerald"
        />
        <KpiCard
          label="Conversion Percentage"
          value={`${data.kpis.conversionRate}%`}
          subtext={`Avg call duration: ${data.kpis.avgCallDurationSec}s`}
          accent="blue"
        />
        <KpiCard
          label="Best-Performing Segment"
          value={data.kpis.bestSegmentLabel}
          subtext={`${data.kpis.bestSegmentRate}% conversion rate`}
        />
      </section>

      {/* Bar + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Conversion Rate by Occupation (%)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Ranks occupation segments by term deposit subscription efficiency under active filters.
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.jobConversion} margin={{ top: 8, right: 12, left: 0, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} angle={-28} textAnchor="end" interval={0} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px' }} formatter={(v) => [`${Number(v ?? 0)}%`, 'Conversion']} />
                <Bar dataKey="conversionRate" fill="#0F294A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Subscription Share (Pie Chart)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Proportion of filtered prospects subscribing vs declining term deposits.
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.outcomePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={84}
                  label={({ name, percent }) => `${String(name ?? '').split(' ')[0]}: ${((percent ?? 0) * 100).toFixed(1)}%`}
                >
                  <Cell fill="#0284C7" />
                  <Cell fill="#0F294A" />
                </Pie>
                <Tooltip formatter={(v) => Number(v ?? 0).toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Line Chart + Contact Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Monthly Conversion Rate Trend (Line Chart)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Tracks monthly conversion rate fluctuations across calendar outreach waves.
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px' }} formatter={(v) => [`${Number(v ?? 0)}%`, 'Conversion']} />
                <Line type="monotone" dataKey="conversionRate" stroke="#0284C7" strokeWidth={2.5} dot={{ r: 4, fill: '#0F294A' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">Channel Effectiveness</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Conversion rate by communication channel
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.contactPerformance} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px' }} formatter={(v) => [`${Number(v ?? 0)}%`, 'Conversion']} />
                <Bar dataKey="conversionRate" fill="#0284C7" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Occupation x Month Heatmap */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Occupation × Month Conversion Heatmap (%)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Highlights high-yield intersection cells across top 8 occupations and outreach months.
            </p>
          </div>
          <span className="text-xs text-slate-500">Darker navy indicates higher conversion %</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-slate-600 font-semibold border-b border-slate-200">
                  Occupation
                </th>
                {data.heatmap.cols.map((m) => (
                  <th
                    key={m}
                    className="px-2 py-2 text-center uppercase text-slate-600 font-semibold border-b border-slate-200"
                  >
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.heatmap.rows.map((row) => (
                <tr key={row} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{row}</td>
                  {data.heatmap.cols.map((col) => {
                    const cell = data.heatmap.cells.find((c) => c.row === row && c.col === col);
                    const rate = cell?.conversionRate ?? 0;
                    const total = cell?.total ?? 0;
                    return (
                      <td key={`${row}-${col}`} className="p-1">
                        <div
                          title={`${row} in ${col}: ${rate}% (${cell?.yes ?? 0}/${total})`}
                          className={`rounded px-2 py-1.5 text-center font-mono tabular-nums text-[11px] ${getHeatColor(rate, total)}`}
                        >
                          {total > 0 ? `${rate}%` : '-'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
