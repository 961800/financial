import React, { useState } from 'react';
import { PredictionInput, PredictionOutput } from '../../types/analytics';

interface PredictionViewProps {
  bestModelName: string | null;
  predicting: boolean;
  prediction: PredictionOutput | null;
  onPredict: (input: PredictionInput) => void;
}

const JOBS = [
  'management',
  'technician',
  'entrepreneur',
  'blue-collar',
  'unknown',
  'retired',
  'admin.',
  'services',
  'self-employed',
  'unemployed',
  'housemaid',
  'student',
];

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export const PredictionView: React.FC<PredictionViewProps> = ({
  bestModelName,
  predicting,
  prediction,
  onPredict,
}) => {
  const [form, setForm] = useState<PredictionInput>({
    age: 38,
    job: 'management',
    marital: 'married',
    education: 'tertiary',
    default: 'no',
    balance: 1850,
    housing: 'no',
    loan: 'no',
    contact: 'cellular',
    month: 'oct',
    campaign: 1,
    poutcome: 'success',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPredict(form);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5"
      >
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Customer Profile &amp; Campaign Outreach Inputs
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Active saved predictor: <strong className="text-slate-800">{bestModelName || 'Default Trained Classifier'}</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Age (Years)</label>
            <input
              type="number"
              min={18}
              max={95}
              required
              value={form.age}
              onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono tabular-nums focus:outline-none focus:border-sky-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Job / Occupation</label>
            <select
              value={form.job}
              onChange={(e) => setForm({ ...form, job: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-600"
            >
              {JOBS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Marital Status</label>
            <select
              value={form.marital}
              onChange={(e) => setForm({ ...form, marital: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-600"
            >
              <option value="married">married</option>
              <option value="single">single</option>
              <option value="divorced">divorced</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Education Level</label>
            <select
              value={form.education}
              onChange={(e) => setForm({ ...form, education: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-600"
            >
              <option value="primary">primary</option>
              <option value="secondary">secondary</option>
              <option value="tertiary">tertiary</option>
              <option value="unknown">unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Credit in Default</label>
            <select
              value={form.default}
              onChange={(e) => setForm({ ...form, default: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-600"
            >
              <option value="no">no</option>
              <option value="yes">yes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Housing Loan</label>
            <select
              value={form.housing}
              onChange={(e) => setForm({ ...form, housing: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-600"
            >
              <option value="no">no</option>
              <option value="yes">yes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Personal Loan</label>
            <select
              value={form.loan}
              onChange={(e) => setForm({ ...form, loan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-600"
            >
              <option value="no">no</option>
              <option value="yes">yes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Contact Type</label>
            <select
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-600"
            >
              <option value="cellular">cellular</option>
              <option value="telephone">telephone</option>
              <option value="unknown">unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Campaign Month</label>
            <select
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-600"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Campaign Contacts</label>
            <input
              type="number"
              min={1}
              max={60}
              required
              value={form.campaign}
              onChange={(e) => setForm({ ...form, campaign: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono tabular-nums focus:outline-none focus:border-sky-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Previous Campaign Outcome</label>
            <select
              value={form.poutcome}
              onChange={(e) => setForm({ ...form, poutcome: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-600"
            >
              <option value="unknown">unknown</option>
              <option value="failure">failure</option>
              <option value="other">other</option>
              <option value="success">success</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Average Yearly Balance (EUR)</label>
            <input
              type="number"
              value={form.balance}
              onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono tabular-nums focus:outline-none focus:border-sky-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={predicting}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#0F294A] hover:bg-[#163A66] rounded-md transition-colors disabled:opacity-60"
        >
          {predicting ? 'Evaluating Customer Propensity...' : 'Predict Term Deposit Subscription'}
        </button>
      </form>

      {/* Prediction Output */}
      <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="pb-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">Prediction Output</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time scoring against the saved ML classification pipeline
          </p>
        </div>

        {prediction ? (
          <>
            <div className="p-4 rounded-md border border-slate-200 bg-slate-50">
              <p className="text-xs font-medium text-slate-500">Predicted Outcome</p>
              <p
                className={`mt-1 text-xl font-semibold font-display ${
                  prediction.willSubscribe ? 'text-emerald-700' : 'text-slate-900'
                }`}
              >
                {prediction.willSubscribe
                  ? 'Likely to Subscribe (Yes)'
                  : 'Unlikely to Subscribe (No)'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {prediction.confidenceLabel} · Model: {prediction.modelUsed}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">Subscription Probability</span>
                <span className="font-mono font-semibold text-sky-700 tabular-nums">
                  {prediction.probability}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-200 ${
                    prediction.probability >= 50 ? 'bg-sky-600' : 'bg-slate-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, prediction.probability))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
                <span>0%</span>
                <span>Threshold 50%</span>
                <span>100%</span>
              </div>
            </div>

            {prediction.contributions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-800 mb-2">
                  Top Contributing Factors for This Customer
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                  {prediction.contributions.map((c) => (
                    <div key={c.factor} className="px-3 py-2 flex items-center justify-between text-xs">
                      <span className="text-slate-700 capitalize">{c.factor}</span>
                      <span
                        className={`font-mono tabular-nums font-medium ${
                          c.direction === 'positive' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {c.impact > 0 ? `+${c.impact}` : c.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
              {prediction.disclaimer}
            </p>
          </>
        ) : (
          <div className="py-8 text-sm text-slate-500">
            Fill out the customer profile on the left and click <strong>Predict Term Deposit Subscription</strong> to compute subscription probability and key decision factors.
          </div>
        )}
      </section>
    </div>
  );
};
