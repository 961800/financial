import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CampaignPerformanceResponse, GroupedOutcomeCount } from '../../types/analytics';
import { KpiCard } from '../KpiCard';

interface PerformanceViewProps {
  data: CampaignPerformanceResponse | null;
  loading: boolean;
}

const ConversionBarCard: React.FC<{
  title: string;
  items: GroupedOutcomeCount[];
  baseline: number;
  color: string;
  angleX?: boolean;
}> = ({ title, items, baseline, color, angleX = false }) => (
  <section className="bg-white border border-slate-200 rounded-lg p-5">
    <div className="flex items-center justify-between gap-4 mb-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <span className="text-xs text-slate-500 tabular-nums">Baseline: {baseline}%</span>
    </div>
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} margin={{ top: 8, right: 12, left: 0, bottom: angleX ? 34 : 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#475569' }}
            angle={angleX ? -28 : 0}
            textAnchor={angleX ? 'end' : 'middle'}
            interval={0}
          />
          <YAxis unit="%" tick={{ fontSize: 11, fill: '#475569' }} />
          <Tooltip
            contentStyle={{ fontSize: '12px', borderRadius: '6px', borderColor: '#CBD5E1' }}
            formatter={(val, _n, item) => {
              const p = item?.payload as GroupedOutcomeCount | undefined;
              return [`${Number(val ?? 0)}% (${p?.yes ?? 0}/${p?.total ?? 0})`, 'Conversion Rate'];
            }}
          />
          <ReferenceLine y={baseline} stroke="#64748B" strokeDasharray="4 4" />
          <Bar dataKey="conversionRate" name="Conversion Rate (%)" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export const PerformanceView: React.FC<PerformanceViewProps> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-500">
        Computing campaign conversion rates and segment rankings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Customers Contacted" value={data.totalContacted.toLocaleString()} />
        <KpiCard
          label="Successful Subscriptions"
          value={data.totalSubscribed.toLocaleString()}
          subtext="Target y = yes"
          accent="emerald"
        />
        <KpiCard
          label="Unsuccessful Responses"
          value={data.totalDeclined.toLocaleString()}
          subtext="Target y = no"
        />
        <KpiCard
          label="Campaign Conversion Rate"
          value={`${data.overallConversionRate}%`}
          subtext={data.bestSegment ? `Top: ${data.bestSegment.segmentValue} (${data.bestSegment.conversionRate}%)` : undefined}
          accent="blue"
        />
      </section>

      {/* Conversion Rate Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionBarCard
          title="Conversion Rate by Occupation (%)"
          items={data.byOccupation}
          baseline={data.overallConversionRate}
          color="#0F294A"
          angleX
        />
        <ConversionBarCard
          title="Conversion Rate by Age Group (%)"
          items={data.byAgeGroup}
          baseline={data.overallConversionRate}
          color="#0284C7"
        />
        <ConversionBarCard
          title="Conversion Rate by Education (%)"
          items={data.byEducation}
          baseline={data.overallConversionRate}
          color="#0284C7"
        />
        <ConversionBarCard
          title="Conversion Rate by Contact Method (%)"
          items={data.byContactMethod}
          baseline={data.overallConversionRate}
          color="#0F294A"
        />
      </div>

      {/* Monthly Conversion Line */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Conversion Rate by Month (%)</h3>
          <span className="text-xs text-slate-500 tabular-nums">Baseline: {data.overallConversionRate}%</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.byMonth} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis unit="%" tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip
                contentStyle={{ fontSize: '12px', borderRadius: '6px', borderColor: '#CBD5E1' }}
                formatter={(val, _n, item) => {
                  const p = item?.payload as GroupedOutcomeCount | undefined;
                  return [`${Number(val ?? 0)}% (${p?.yes ?? 0}/${p?.total ?? 0})`, 'Conversion Rate'];
                }}
              />
              <ReferenceLine y={data.overallConversionRate} stroke="#64748B" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="conversionRate"
                stroke="#0284C7"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0F294A' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Top Performing Customer Segments Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Best-Performing Customer Segments (Ranked by Conversion Lift)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Segments meeting minimum statistical sample size, ranked by conversion rate and lift vs portfolio baseline.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-2.5">Rank</th>
                <th className="px-4 py-2.5">Dimension</th>
                <th className="px-4 py-2.5">Segment</th>
                <th className="px-4 py-2.5 text-right">Contacted</th>
                <th className="px-4 py-2.5 text-right">Subscriptions</th>
                <th className="px-4 py-2.5 text-right">Conversion Rate</th>
                <th className="px-4 py-2.5 text-right">Lift vs Baseline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.topSegments.map((seg, idx) => (
                <tr key={`${seg.segmentType}-${seg.segmentValue}`} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-mono tabular-nums text-slate-500">#{idx + 1}</td>
                  <td className="px-4 py-2.5 text-slate-600">{seg.segmentType}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900 capitalize">{seg.segmentValue}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{seg.contacted.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{seg.subscriptions.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-sky-700">
                    {seg.conversionRate}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-700 font-medium">
                    {seg.liftVsBaseline}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
