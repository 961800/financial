import React from 'react';
import { BusinessInsightsResponse } from '../../types/analytics';
import { KpiCard } from '../KpiCard';

interface InsightsViewProps {
  data: BusinessInsightsResponse | null;
  loading: boolean;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-500">
        Generating automated business insights...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Diagnostic Findings */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Baseline Conversion Rate"
          value={`${data.baselineConversion}%`}
          subtext="Overall portfolio response rate"
        />
        <KpiCard
          label="Best Contact Channel"
          value={data.contactChannelFinding.bestChannel}
          subtext={`${data.contactChannelFinding.bestRate}% vs ${data.contactChannelFinding.worstRate}% (${data.contactChannelFinding.worstChannel})`}
          accent="blue"
        />
        <KpiCard
          label="Peak Efficiency Month"
          value={data.monthlySeasonalityFinding.peakMonths[0]?.month.toUpperCase() || 'N/A'}
          subtext={`${data.monthlySeasonalityFinding.peakMonths[0]?.rate ?? 0}% conversion rate`}
          accent="emerald"
        />
        <KpiCard
          label="Optimal Call Frequency"
          value={data.frequencyFinding.optimalContacts}
          subtext={`${data.frequencyFinding.sweetSpotRate}% at 1st contact vs ${data.frequencyFinding.overContactedRate}% at 6+`}
        />
      </section>

      {/* Customer Segments Responding Best */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-base font-semibold text-slate-900">
          1. Which Customer Segments Respond Best?
        </h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.topSegments.map((seg) => (
            <div key={seg.title} className="p-4 rounded-md border border-slate-200 bg-slate-50/50">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">{seg.title}</h3>
                <span className="font-mono text-xs font-semibold text-sky-700 tabular-nums shrink-0">
                  {seg.metric}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">{seg.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Channel, Seasonality, Frequency Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">2. Best Contact Method</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {data.contactChannelFinding.summary}
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">3. Monthly Conversion Dynamics</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {data.monthlySeasonalityFinding.summary}
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">4. Contact Fatigue Threshold</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {data.frequencyFinding.summary}
          </p>
        </section>
      </div>

      {/* Actionable Banking Recommendations */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Strategic Recommendations for Campaign Optimization &amp; Targeting
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Focus Area</th>
                <th className="px-5 py-3">Recommended Action</th>
                <th className="px-5 py-3">Expected Campaign Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recommendations.map((rec, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-semibold whitespace-nowrap">
                    <span className={rec.priority === 'High' ? 'text-sky-700' : 'text-slate-600'}>
                      {rec.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                    {rec.area}
                  </td>
                  <td className="px-5 py-3.5 text-slate-700 leading-relaxed">{rec.action}</td>
                  <td className="px-5 py-3.5 text-slate-600 leading-relaxed">{rec.expectedImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
