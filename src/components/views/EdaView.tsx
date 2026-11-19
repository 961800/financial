import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EdaResponse, GroupedOutcomeCount } from '../../types/analytics';

interface EdaViewProps {
  data: EdaResponse | null;
  loading: boolean;
}

const COLOR_NO = '#0F294A';
const COLOR_YES = '#0284C7';

const OutcomeBarCard: React.FC<{
  title: string;
  subtitle: string;
  items: GroupedOutcomeCount[];
  stacked?: boolean;
  angleX?: boolean;
}> = ({ title, subtitle, items, stacked = false, angleX = false }) => (
  <section className="bg-white border border-slate-200 rounded-lg p-5">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="text-xs text-slate-500 mt-0.5 mb-4">{subtitle}</p>
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
          <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
          <Tooltip
            contentStyle={{ fontSize: '12px', borderRadius: '6px', borderColor: '#CBD5E1' }}
            formatter={(value, name) => [Number(value ?? 0).toLocaleString(), String(name ?? '')]}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="no" name="Not Subscribed (No)" stackId={stacked ? 'a' : undefined} fill={COLOR_NO} radius={[2, 2, 0, 0]} />
          <Bar dataKey="yes" name="Subscribed (Yes)" stackId={stacked ? 'a' : undefined} fill={COLOR_YES} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export const EdaView: React.FC<EdaViewProps> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-500">
        Computing exploratory data visualizations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Customer Age Distribution */}
        <OutcomeBarCard
          title="1. Customer Age Distribution"
          subtitle="Age brackets split by term deposit subscription outcome"
          items={data.ageDistribution}
        />

        {/* 10. Subscription Success vs Failure */}
        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">10. Subscription Success vs Failure</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Overall class distribution illustrating target imbalance ({data.summary.conversionRate}% positive)
          </p>
          <div className="h-64 w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.targetSplit}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={88}
                  paddingAngle={2}
                  label={({ name, percent }) => `${String(name ?? '')}: ${((percent ?? 0) * 100).toFixed(1)}%`}
                >
                  <Cell fill={COLOR_YES} />
                  <Cell fill={COLOR_NO} />
                </Pie>
                <Tooltip formatter={(v) => Number(v ?? 0).toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 2. Customer Job Categories */}
        <OutcomeBarCard
          title="2. Customer Job Categories"
          subtitle="Outreach volume and subscriptions across occupation groups"
          items={data.jobDistribution}
          stacked
          angleX
        />

        {/* 3. Marital Status */}
        <OutcomeBarCard
          title="3. Marital Status Distribution"
          subtitle="Campaign outcome count by customer marital category"
          items={data.maritalDistribution}
        />

        {/* 4. Education Levels */}
        <OutcomeBarCard
          title="4. Education Levels"
          subtitle="Subscription distribution across academic attainment tiers"
          items={data.educationDistribution}
        />

        {/* 5. Contact Methods */}
        <OutcomeBarCard
          title="5. Contact Methods"
          subtitle="Communication channels (cellular, telephone, unknown)"
          items={data.contactDistribution}
        />

        {/* 6. Campaign Duration */}
        <OutcomeBarCard
          title="6. Campaign Call Duration"
          subtitle="Call length brackets; longer calls strongly correlate with subscriptions"
          items={data.durationDistribution}
        />

        {/* 7. Number of Campaign Contacts */}
        <OutcomeBarCard
          title="7. Number of Campaign Contacts"
          subtitle="Touchpoints per customer during the active campaign cycle"
          items={data.campaignContactsDistribution}
        />

        {/* 8. Monthly Campaign Performance */}
        <OutcomeBarCard
          title="8. Monthly Campaign Performance"
          subtitle="Seasonal contact volume and successful term deposit conversions"
          items={data.monthlyPerformance}
          stacked
        />

        {/* 9. Previous Campaign Outcomes */}
        <OutcomeBarCard
          title="9. Previous Campaign Outcomes"
          subtitle="Impact of prior campaign response (success, failure, other, unknown)"
          items={data.poutcomeDistribution}
        />
      </div>
    </div>
  );
};
