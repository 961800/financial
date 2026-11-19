import React from 'react';
import { Download, Printer } from 'lucide-react';
import {
  BusinessInsightsResponse,
  CampaignPerformanceResponse,
  DatasetSummary,
  MLComparisonResponse,
} from '../../types/analytics';

interface ReportViewProps {
  summary: DatasetSummary | null;
  performance: CampaignPerformanceResponse | null;
  ml: MLComparisonResponse | null;
  insights: BusinessInsightsResponse | null;
}

export const ReportView: React.FC<ReportViewProps> = ({
  summary,
  performance,
  ml,
  insights,
}) => {
  const buildSvgMonthlyChart = () => {
    const months = performance?.byMonth || [];
    if (months.length === 0) return '';
    const maxRate = Math.max(...months.map((m) => m.conversionRate), 10);
    const width = 620;
    const height = 200;
    const padL = 38;
    const padB = 28;
    const barW = Math.floor((width - padL - 20) / months.length) - 8;

    const bars = months
      .map((m, idx) => {
        const h = Math.round(((m.conversionRate / maxRate) * (height - padB - 20)));
        const x = padL + idx * (barW + 8);
        const y = height - padB - h;
        return `
          <rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="#0F294A" rx="2" />
          <text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="9" fill="#334155">${m.conversionRate}%</text>
          <text x="${x + barW / 2}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#475569">${m.label.toUpperCase()}</text>
        `;
      })
      .join('');

    return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="200" xmlns="http://www.w3.org/2000/svg" style="font-family:sans-serif;border:1px solid #e2e8f0;border-radius:6px;background:#fff;">
      <line x1="${padL}" y1="${height - padB}" x2="${width - 10}" y2="${height - padB}" stroke="#cbd5e1" />
      ${bars}
    </svg>`;
  };

  const buildMarkdown = (): string => {
    const mlRows = ml
      ? ml.models
          .map(
            (m) =>
              `| ${m.modelName} | ${m.accuracy}% | ${m.precision}% | ${m.recall}% | ${m.f1Score}% | ${m.rocAuc.toFixed(4)} |`
          )
          .join('\n')
      : '| Pending | - | - | - | - | - |';

    const topSegs = (performance?.topSegments || [])
      .slice(0, 6)
      .map(
        (s) =>
          `- **${s.segmentType}: ${s.segmentValue}** — ${s.conversionRate}% conversion (${s.subscriptions}/${s.contacted}, ${s.liftVsBaseline}x lift)`
      )
      .join('\n');

    return `# Bank Marketing Campaign Analysis Using Data Analytics and Machine Learning

## 1. Abstract
This project investigates direct telemarketing campaign outcomes for retail term deposit subscriptions using the UCI Bank Marketing dataset (${summary?.rowCount.toLocaleString() ?? 0} records, ${summary?.columnCount ?? 17} attributes). By integrating automated data cleaning, exploratory visualization, segment conversion profiling, and class-balanced machine learning pipelines (Logistic Regression, Decision Tree, and Random Forest), the system identifies high-propensity customer segments and predicts subscription likelihood prior to outbound contact.

## 2. Introduction
Retail banks depend on term deposits to stabilize capital reserves and fund lending portfolios. Outbound telemarketing remains a core acquisition channel, yet untargeted mass dialing suffers from low response rates and high operational overhead. Data analytics and predictive modeling transform raw call logs into actionable customer propensity intelligence.

## 3. Problem Statement
In the analyzed banking campaign corpus, only **${summary?.conversionRate ?? 11.5}%** of contacted customers subscribed to a term deposit (${summary?.positiveCount.toLocaleString() ?? 0} subscriptions vs ${summary?.negativeCount.toLocaleString() ?? 0} rejections). This severe class imbalance causes naive outreach strategies to waste advisor capacity and creates customer contact fatigue.

## 4. Objectives
1. Explore and audit banking campaign data quality (missing values, \`unknown\` tokens, duplicates, and distributions).
2. Execute reproducible data cleaning and feature preparation without target leakage.
3. Visualize demographic, financial, and seasonal drivers across 10 exploratory dimensions.
4. Measure campaign conversion rates by occupation, age group, education, contact channel, and month.
5. Train, evaluate, and persist Logistic Regression, Decision Tree, and Random Forest models using ROC-AUC, F1-score, Precision, Recall, and Confusion Matrices.
6. Provide an interactive customer subscription predictor and executive dashboard.

## 5. Literature / Background
Moro, Cortez, and Rita (2014) demonstrated on the Portuguese retail banking dataset that pre-call demographic and macroeconomic attributes, paired with ensemble decision models, significantly outperform random dialing. Importantly, the UCI repository notes that call \`duration\` is unknown prior to placing a call and must be excluded from realistic pre-call predictive models to avoid data leakage.

## 6. Dataset Description
- **Source**: UCI Machine Learning Repository — Bank Marketing Dataset (ID 222)
- **Active File**: ${summary?.datasetName ?? 'bank.csv'}
- **Total Records**: ${summary?.rowCount.toLocaleString() ?? 0}
- **Features**: Demographic (\`age\`, \`job\`, \`marital\`, \`education\`), Banking Profile (\`default\`, \`balance\`, \`housing\`, \`loan\`), Campaign Outreach (\`contact\`, \`day\`, \`month\`, \`duration\`, \`campaign\`, \`pdays\`, \`previous\`, \`poutcome\`), Target (\`y\`: yes/no).

## 7. Methodology
1. **Ingestion & Target Normalization**: Automatic delimiter detection (\`;\` / \`,\`) and target column \`y\` mapping.
2. **Data Cleaning**: Mode imputation for profile \`unknown\` tokens, exact deduplication, and 1.5x IQR outlier winsorization.
3. **Stratified Splitting & Pipelines**: Fit \`StandardScaler\` and \`OneHotEncoder\` strictly on training folds (${ml?.trainRows ?? '-'} train / ${ml?.testRows ?? '-'} test rows).
4. **Class Imbalance Handling**: Balanced inverse-frequency sample weights applied during model training.

## 8. Algorithms Used
- **Logistic Regression**: L2-regularized probabilistic linear model optimized via Adam gradient descent.
- **Decision Tree Classifier**: CART binary tree using weighted Gini impurity splitting.
- **Random Forest Classifier**: Bagged ensemble of 25 decorrelated CART trees with \`sqrt(d)\` feature subsampling.

## 9. Results and Discussion
### Model Performance Comparison
| Model | Accuracy | Precision | Recall | F1-Score | ROC-AUC |
| :--- | ---: | ---: | ---: | ---: | ---: |
${mlRows}

**Best Saved Model**: ${ml?.bestModelName ?? 'Random Forest'}

### Top Performing Segments
${topSegs}

### Key Automated Findings
- **Channel Performance**: ${insights?.contactChannelFinding.summary ?? ''}
- **Seasonality**: ${insights?.monthlySeasonalityFinding.summary ?? ''}
- **Contact Frequency**: ${insights?.frequencyFinding.summary ?? ''}

## 10. Conclusion
Combining interactive segment analytics with class-weighted machine learning enables banks to focus advisor outreach on high-propensity cohorts—such as prior campaign responders, cellular contacts, retirees/students, and peak seasonal months—while capping repetitive calls beyond 3 attempts.

## 11. Future Enhancements
- Integrate gradient boosting algorithms (XGBoost / LightGBM) and SHAP local explanations.
- Connect real-time CRM dialing queues via REST APIs and track post-deployment A/B conversion lift.
- Incorporate macroeconomic indicators (Euribor 3-month rate, CPI, employment variation).

## 12. References
1. Moro, S., Cortez, P., & Rita, P. (2014). *A Data-Driven Approach to Predict the Success of Bank Telemarketing*. Decision Support Systems, 62, 22-31.
2. UCI Machine Learning Repository: Bank Marketing Data Set. https://archive.ics.uci.edu/dataset/222/bank+marketing
3. Pedregosa, F. et al. (2011). *Scikit-learn: Machine Learning in Python*. Journal of Machine Learning Research.
`;
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    const chartSvg = buildSvgMonthlyChart();
    const mlTableRows = (ml?.models || [])
      .map(
        (m) => `<tr>
          <td>${m.modelName}</td>
          <td>${m.accuracy}%</td>
          <td>${m.precision}%</td>
          <td>${m.recall}%</td>
          <td>${m.f1Score}%</td>
          <td><strong>${m.rocAuc.toFixed(4)}</strong></td>
        </tr>`
      )
      .join('');

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Bank Marketing Campaign Analysis - Project Report</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; max-width: 860px; margin: 40px auto; line-height: 1.65; padding: 0 24px; }
  h1 { color: #0A192F; border-bottom: 2px solid #0284C7; padding-bottom: 12px; }
  h2 { color: #0F294A; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
  th { background: #f1f5f9; }
  .meta { color: #475569; font-size: 13px; }
</style>
</head>
<body>
  <h1>Bank Marketing Campaign Analysis Using Data Analytics and Machine Learning</h1>
  <p class="meta">Dataset: ${summary?.datasetName ?? 'UCI Bank Marketing'} · Records: ${summary?.rowCount.toLocaleString() ?? 0} · Baseline Conversion: ${summary?.conversionRate ?? 0}%</p>
  <h2>1. Abstract</h2>
  <p>This project investigates direct telemarketing campaign outcomes for retail term deposits (${summary?.rowCount.toLocaleString() ?? 0} records). Using automated cleaning, exploratory analysis, and leakage-free machine learning pipelines, the platform identifies responsive customer cohorts and predicts individual subscription propensity.</p>
  <h2>2. Introduction &amp; Problem Statement</h2>
  <p>Retail banks achieve only ${summary?.conversionRate ?? 11.5}% conversion on mass outbound campaigns. Identifying probable subscribers before dialing reduces cost and prevents contact fatigue.</p>
  <h2>3. Objectives &amp; Methodology</h2>
  <p>Workflow: Data Ingestion &rarr; Cleaning &amp; IQR Winsorization &rarr; EDA &rarr; Stratified Split &amp; Balanced Pipeline Training (Logistic Regression, Decision Tree, Random Forest) &rarr; Scoring &amp; Reporting.</p>
  <h2>4. Monthly Conversion Figure (Embedded Chart)</h2>
  ${chartSvg}
  <h2>5. Machine Learning Results</h2>
  <table>
    <thead><tr><th>Model</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1-Score</th><th>ROC-AUC</th></tr></thead>
    <tbody>${mlTableRows}</tbody>
  </table>
  <p><strong>Best Saved Model:</strong> ${ml?.bestModelName ?? 'N/A'} (${ml?.config.excludeDuration ? 'Pre-call features without duration leakage' : 'Includes duration'})</p>
  <h2>6. Business Insights &amp; Conclusion</h2>
  <p>${insights?.contactChannelFinding.summary ?? ''} ${insights?.monthlySeasonalityFinding.summary ?? ''} ${insights?.frequencyFinding.summary ?? ''}</p>
  <h2>7. Future Enhancements &amp; References</h2>
  <ul>
    <li>Moro, S., Cortez, P., &amp; Rita, P. (2014). A Data-Driven Approach to Predict the Success of Bank Telemarketing. Decision Support Systems.</li>
    <li>UCI Machine Learning Repository: Bank Marketing Dataset (ID 222).</li>
  </ul>
</body>
</html>`;

    downloadFile(html, 'Bank_Marketing_Project_Report.html', 'text/html;charset=utf-8');
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <section className="no-print bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Downloadable College Mini-Project Report
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Automatically populated with your active dataset metrics, embedded SVG charts, and trained ML comparison results.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadHtml}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#163A66] rounded-md transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download HTML Report (With Charts)</span>
          </button>

          <button
            type="button"
            onClick={() => downloadFile(buildMarkdown(), 'Bank_Marketing_Project_Report.md', 'text/markdown;charset=utf-8')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Markdown (.md)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-sky-700 border border-sky-200 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>

          <a
            href="/api/export/streamlit-zip"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Python/Streamlit Code (.zip)</span>
          </a>
        </div>
      </section>

      {/* Academic Report Preview Document */}
      <article className="bg-white border border-slate-200 rounded-lg p-8 sm:p-10 max-w-5xl space-y-6 text-sm text-slate-700 leading-relaxed">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-xs font-medium text-sky-700">
            B.Tech Computer Science / Data Science Project Report
          </p>
          <h1 className="mt-2 text-2xl font-semibold font-display text-slate-900">
            Bank Marketing Campaign Analysis Using Data Analytics and Machine Learning
          </h1>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            Dataset: {summary?.datasetName} · Records: {summary?.rowCount.toLocaleString()} · Baseline Conversion: {summary?.conversionRate}%
          </p>
        </header>

        <section>
          <h2 className="text-base font-semibold text-slate-900">1. Abstract</h2>
          <p className="mt-1.5">
            Direct telemarketing campaigns in retail banking face low conversion rates and high operational outreach costs.
            Analyzing {summary?.rowCount.toLocaleString()} historical customer interactions from the UCI Bank Marketing corpus,
            this project builds an end-to-end analytics and machine learning pipeline covering data exploration, cleaning,
            exploratory visualization, segment conversion profiling, and leakage-free predictive classification using
            Logistic Regression, Decision Tree, and Random Forest models.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900">2. Introduction &amp; Problem Statement</h2>
          <p className="mt-1.5">
            Term deposits provide stable long-term funding for banks. However, with only{' '}
            <span className="font-mono tabular-nums font-medium">{summary?.conversionRate}%</span> of contacted customers subscribing
            ({summary?.positiveCount.toLocaleString()} positive out of {summary?.rowCount.toLocaleString()} calls),
            untargeted mass dialing incurs excessive call-center expense and customer fatigue. Predictive propensity scoring
            solves this by ranking prospects prior to contact.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900">3. Objectives &amp; Literature Background</h2>
          <p className="mt-1.5">
            Following Moro, Cortez, and Rita (2014) on Portuguese banking telemarketing, our objectives are to identify
            behavioral drivers of subscription, prevent post-call data leakage (excluding call duration during pre-call scoring),
            mitigate class imbalance via inverse-frequency weighting, and deliver actionable segment targeting strategies.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900">4. Dataset Description &amp; Methodology</h2>
          <p className="mt-1.5">
            The dataset comprises {summary?.columnCount} attributes spanning customer demographics (age, job, marital status,
            education), banking liabilities (credit default, balance, housing loan, personal loan), and campaign history
            (contact channel, month, campaign contacts, previous outcome), predicting binary target{' '}
            <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{summary?.targetColumn}</code>.
            Preprocessing uses mode imputation, deduplication, IQR outlier winsorization, StandardScaler, and OneHotEncoder
            inside training-fold-only pipelines.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900">5. Algorithms Used &amp; Experimental Results</h2>
          {ml && (
            <div className="mt-3 overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Algorithm</th>
                    <th className="px-4 py-2.5 text-right">Accuracy</th>
                    <th className="px-4 py-2.5 text-right">Precision</th>
                    <th className="px-4 py-2.5 text-right">Recall</th>
                    <th className="px-4 py-2.5 text-right">F1-Score</th>
                    <th className="px-4 py-2.5 text-right">ROC-AUC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ml.models.map((m) => (
                    <tr key={m.modelKey}>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{m.modelName}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">{m.accuracy}%</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">{m.precision}%</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">{m.recall}%</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">{m.f1Score}%</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-sky-700">
                        {m.rocAuc.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900">6. Embedded Analytical Chart: Monthly Conversion Rate (%)</h2>
          <div
            className="mt-3"
            dangerouslySetInnerHTML={{ __html: buildSvgMonthlyChart() }}
          />
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900">7. Conclusion &amp; Future Enhancements</h2>
          <p className="mt-1.5">
            {insights?.contactChannelFinding.summary} {insights?.frequencyFinding.summary} Future iterations can integrate
            gradient boosted ensembles (XGBoost/LightGBM), SHAP local explainability, and live CRM scoring webhooks.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900">8. References</h2>
          <ol className="mt-1.5 list-decimal list-inside space-y-1 text-xs text-slate-600">
            <li>Moro, S., Cortez, P., &amp; Rita, P. (2014). A Data-Driven Approach to Predict the Success of Bank Telemarketing. Decision Support Systems, 62, 22-31.</li>
            <li>UCI Machine Learning Repository: Bank Marketing Dataset (ID 222). https://archive.ics.uci.edu/dataset/222/bank+marketing</li>
            <li>Pedregosa, F. et al. (2011). Scikit-learn: Machine Learning in Python. Journal of Machine Learning Research, 12, 2825-2830.</li>
          </ol>
        </section>
      </article>
    </div>
  );
};
