import React, { useState } from 'react';
import { Download, Play } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MLComparisonResponse, MLTrainConfig } from '../../types/analytics';
import { KpiCard } from '../KpiCard';

interface MlComparisonViewProps {
  data: MLComparisonResponse | null;
  training: boolean;
  onTrainModels: (config: MLTrainConfig) => void;
}

const MODEL_COLORS: Record<string, string> = {
  logistic_regression: '#0284C7',
  decision_tree: '#D97706',
  random_forest: '#0F294A',
};

export const MlComparisonView: React.FC<MlComparisonViewProps> = ({
  data,
  training,
  onTrainModels,
}) => {
  const [testSize, setTestSize] = useState(0.2);
  const [handleImbalance, setHandleImbalance] = useState(true);
  const [excludeDuration, setExcludeDuration] = useState(true);

  const handleRunTraining = () => {
    onTrainModels({
      testSize,
      handleImbalance,
      excludeDuration,
      maxRows: 12000,
    });
  };

  // Build unified ROC chart dataset across 41 thresholds
  const rocSeries = data
    ? data.models[0].rocCurve.map((pt, idx) => ({
        threshold: pt.threshold,
        baseline: Number((1 - pt.threshold).toFixed(3)),
        lrFpr: data.models[0]?.rocCurve[idx]?.fpr ?? 0,
        lrTpr: data.models[0]?.rocCurve[idx]?.tpr ?? 0,
        dtFpr: data.models[1]?.rocCurve[idx]?.fpr ?? 0,
        dtTpr: data.models[1]?.rocCurve[idx]?.tpr ?? 0,
        rfFpr: data.models[2]?.rocCurve[idx]?.fpr ?? 0,
        rfTpr: data.models[2]?.rocCurve[idx]?.tpr ?? 0,
      }))
    : [];

  // Build Recharts scatter/line friendly points sorted by FPR per model
  const buildRocChartPoints = () => {
    if (!data) return [];
    const grid = Array.from({ length: 21 }, (_, i) => i / 20);
    const interpTpr = (curve: { fpr: number; tpr: number }[], targetFpr: number) => {
      const sorted = [...curve].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);
      let best = 0;
      for (const p of sorted) {
        if (p.fpr <= targetFpr + 0.025) {
          best = Math.max(best, p.tpr);
        }
      }
      return Number(best.toFixed(3));
    };

    return grid.map((fpr) => ({
      fpr: Number(fpr.toFixed(2)),
      baseline: Number(fpr.toFixed(2)),
      logistic_regression: interpTpr(data.models[0].rocCurve, fpr),
      decision_tree: interpTpr(data.models[1].rocCurve, fpr),
      random_forest: interpTpr(data.models[2].rocCurve, fpr),
    }));
  };

  const rocPlotData = buildRocChartPoints();
  const bestModel = data?.models.find((m) => m.modelKey === data.bestModelKey) || data?.models[0];

  return (
    <div className="space-y-6">
      {/* Training Controls */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Train &amp; Compare Machine Learning Pipelines
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Preprocessing (StandardScaler + OneHotEncoder) is fit strictly on the training split to prevent data leakage.
            </p>
          </div>
          {data && (
            <a
              href="/api/ml/download-model"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-sky-700 border border-sky-200 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Saved Best Model (.json)</span>
            </a>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Stratified Test Split Ratio
            </label>
            <select
              value={testSize}
              onChange={(e) => setTestSize(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-600"
            >
              <option value={0.15}>15% Test / 85% Train</option>
              <option value={0.2}>20% Test / 80% Train</option>
              <option value={0.25}>25% Test / 75% Train</option>
              <option value={0.3}>30% Test / 70% Train</option>
            </select>
          </div>

          <label className="flex items-start gap-2.5 text-xs text-slate-700 p-2.5 rounded-md border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={handleImbalance}
              onChange={(e) => setHandleImbalance(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-sky-700"
            />
            <span>
              <strong className="block text-slate-900">Class Imbalance Weighting</strong>
              Apply balanced inverse-frequency weights
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-xs text-slate-700 p-2.5 rounded-md border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeDuration}
              onChange={(e) => setExcludeDuration(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-sky-700"
            />
            <span>
              <strong className="block text-slate-900">Exclude 'duration' Feature</strong>
              Prevent post-call target leakage
            </span>
          </label>

          <button
            type="button"
            disabled={training}
            onClick={handleRunTraining}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0F294A] hover:bg-[#163A66] rounded-md transition-colors disabled:opacity-60"
          >
            <Play className="w-4 h-4" />
            <span>{training ? 'Training 3 Models...' : 'Train & Compare Models'}</span>
          </button>
        </div>
      </section>

      {data && (
        <>
          {/* Summary KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Best-Performing Model"
              value={data.bestModelName}
              subtext={`Saved to ${data.modelSavedPath}`}
              accent="blue"
            />
            <KpiCard
              label="Top ROC-AUC Score"
              value={bestModel ? bestModel.rocAuc.toFixed(4) : '-'}
              subtext={`F1-Score: ${bestModel?.f1Score ?? 0}%`}
              accent="emerald"
            />
            <KpiCard
              label="Train / Test Split"
              value={`${data.trainRows.toLocaleString()} / ${data.testRows.toLocaleString()}`}
              subtext={`${data.positiveRatioTrain}% / ${data.positiveRatioTest}% positive ratio`}
            />
            <KpiCard
              label="Encoded Feature Count"
              value={data.featureCount}
              subtext={data.config.excludeDuration ? 'Pre-call features only (no duration)' : 'Includes call duration'}
            />
          </section>

          {/* Metrics Comparison Table */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Classifier Performance Comparison (Hold-Out Test Set)
              </h3>
              <span className="text-xs text-slate-500">
                Imbalance: {data.config.handleImbalance ? 'Balanced Weights' : 'Unweighted'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Algorithm</th>
                    <th className="px-4 py-3 text-right">Accuracy</th>
                    <th className="px-4 py-3 text-right">Precision</th>
                    <th className="px-4 py-3 text-right">Recall</th>
                    <th className="px-4 py-3 text-right">F1-Score</th>
                    <th className="px-4 py-3 text-right">ROC-AUC</th>
                    <th className="px-4 py-3 text-right">Train Time</th>
                    <th className="px-4 py-3">Selection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.models.map((m) => {
                    const isBest = m.modelKey === data.bestModelKey;
                    return (
                      <tr key={m.modelKey} className={isBest ? 'bg-sky-50/40' : 'hover:bg-slate-50/70'}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{m.modelName}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{m.accuracy}%</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{m.precision}%</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{m.recall}%</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{m.f1Score}%</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-sky-700">
                          {m.rocAuc.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500">
                          {m.trainTimeMs} ms
                        </td>
                        <td className="px-4 py-3 text-xs font-medium">
                          {isBest ? (
                            <span className="text-sky-700">Selected &amp; Saved</span>
                          ) : (
                            <span className="text-slate-400">Benchmark</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ROC Curve + Feature Importance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-slate-900">ROC Curve Comparison (All 3 Models)</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-4">
                True Positive Rate vs False Positive Rate across classification thresholds (n = {rocSeries.length} thresholds)
              </p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rocPlotData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="fpr"
                      type="number"
                      domain={[0, 1]}
                      tick={{ fontSize: 11, fill: '#475569' }}
                      label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -4, fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      domain={[0, 1]}
                      tick={{ fontSize: 11, fill: '#475569' }}
                      label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="logistic_regression"
                      name={`Logistic Regression (AUC ${data.models[0].rocAuc.toFixed(3)})`}
                      stroke={MODEL_COLORS.logistic_regression}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="decision_tree"
                      name={`Decision Tree (AUC ${data.models[1].rocAuc.toFixed(3)})`}
                      stroke={MODEL_COLORS.decision_tree}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="random_forest"
                      name={`Random Forest (AUC ${data.models[2].rocAuc.toFixed(3)})`}
                      stroke={MODEL_COLORS.random_forest}
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="linear"
                      dataKey="baseline"
                      name="Random Chance (AUC 0.500)"
                      stroke="#94A3B8"
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {bestModel && (
              <section className="bg-white border border-slate-200 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Top Predictive Features ({bestModel.modelName})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 mb-4">
                  Relative feature contribution share (%) in predicting term deposit subscription
                </p>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bestModel.featureImportances}
                      layout="vertical"
                      margin={{ top: 4, right: 20, left: 40, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        width={110}
                        tick={{ fontSize: 11, fill: '#334155' }}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                        formatter={(v) => [`${Number(v ?? 0)}%`, 'Importance']}
                      />
                      <Bar dataKey="importance" fill="#0F294A" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </div>

          {/* Confusion Matrices */}
          <section className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Confusion Matrices (Hold-Out Test Evaluation)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {data.models.map((m) => (
                <div key={m.modelKey} className="border border-slate-200 rounded-md p-4 bg-slate-50/40">
                  <p className="text-xs font-semibold text-slate-900 mb-3">{m.modelName}</p>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-white border border-slate-200 rounded p-2.5">
                      <span className="block text-[11px] text-slate-500">True Negative (TN)</span>
                      <span className="block mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {m.confusionMatrix.tn.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-amber-50/70 border border-amber-200 rounded p-2.5">
                      <span className="block text-[11px] text-amber-800">False Positive (FP)</span>
                      <span className="block mt-1 font-mono text-base font-semibold text-amber-900 tabular-nums">
                        {m.confusionMatrix.fp.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-rose-50/70 border border-rose-200 rounded p-2.5">
                      <span className="block text-[11px] text-rose-800">False Negative (FN)</span>
                      <span className="block mt-1 font-mono text-base font-semibold text-rose-900 tabular-nums">
                        {m.confusionMatrix.fn.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-sky-50 border border-sky-200 rounded p-2.5">
                      <span className="block text-[11px] text-sky-800">True Positive (TP)</span>
                      <span className="block mt-1 font-mono text-base font-semibold text-sky-900 tabular-nums">
                        {m.confusionMatrix.tp.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Disclaimer: Machine learning classification outputs represent statistical probability estimates based on historical campaign behavior—not guarantees of individual customer subscription.
            </p>
          </section>
        </>
      )}
    </div>
  );
};
