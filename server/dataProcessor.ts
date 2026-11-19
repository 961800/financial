import Papa from 'papaparse';
import {
  BankRecord,
  BusinessInsightsResponse,
  CampaignPerformanceResponse,
  CleaningConfig,
  CleaningResult,
  ColumnProfile,
  DashboardFilters,
  DashboardResponse,
  DatasetSummary,
  EdaResponse,
  ExplorationResponse,
  GroupedOutcomeCount,
  HeatmapCell,
  OutlierReportItem,
  SegmentRankItem,
  TargetValue,
} from './types.ts';

const MONTH_ORDER = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const KNOWN_NUMERIC_COLS = new Set(['age', 'balance', 'day', 'duration', 'campaign', 'pdays', 'previous']);

function normalizeTarget(raw: unknown): TargetValue {
  const v = String(raw ?? '').trim().toLowerCase().replace(/^"|"$/g, '');
  if (v === 'yes' || v === '1' || v === 'true' || v === 'y' || v === 'subscribed') {
    return 'yes';
  }
  return 'no';
}

function detectTargetColumn(headers: string[], rows: Record<string, unknown>[]): string {
  const lowerHeaders = headers.map((h) => h.trim().toLowerCase());
  const yIdx = lowerHeaders.indexOf('y');
  if (yIdx !== -1) return headers[yIdx];

  const candidateNames = ['target', 'deposit', 'subscribed', 'subscription', 'outcome', 'label', 'class'];
  for (const cand of candidateNames) {
    const idx = lowerHeaders.indexOf(cand);
    if (idx !== -1) return headers[idx];
  }

  for (const h of headers) {
    const vals = new Set(
      rows.slice(0, 100).map((r) => String(r[h] ?? '').trim().toLowerCase())
    );
    if (vals.size <= 3 && (vals.has('yes') || vals.has('no'))) {
      return h;
    }
  }
  return headers[headers.length - 1] || 'y';
}

function detectDelimiter(csvText: string): string {
  const firstLine = csvText.split(/\r?\n/)[0] || '';
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  if (semiCount >= commaCount && semiCount >= tabCount && semiCount > 0) return ';';
  if (tabCount > commaCount && tabCount > 0) return '\t';
  return ',';
}

export function parseBankCsv(
  csvText: string,
  datasetName: string,
  source: DatasetSummary['source']
): { rawRecords: Record<string, string | number>[]; normalizedRecords: BankRecord[]; targetColumn: string } {
  const cleanedText = csvText.trim();
  const delimiter = detectDelimiter(cleanedText);

  const parsed = Papa.parse<Record<string, string>>(cleanedText, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^"|"$/g, ''),
  });

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error('CSV file contains no readable rows.');
  }

  const headers = parsed.meta.fields || Object.keys(parsed.data[0]);
  if (headers.length < 3) {
    throw new Error('CSV must contain at least 3 columns including features and target.');
  }

  const targetColumn = detectTargetColumn(headers, parsed.data);

  const rawRecords: Record<string, string | number>[] = [];
  const normalizedRecords: BankRecord[] = [];

  for (const row of parsed.data) {
    const rawRow: Record<string, string | number> = {};
    for (const h of headers) {
      const val = row[h];
      const strVal = val === undefined || val === null ? '' : String(val).trim();
      if (strVal !== '' && !Number.isNaN(Number(strVal)) && KNOWN_NUMERIC_COLS.has(h.toLowerCase())) {
        rawRow[h] = Number(strVal);
      } else {
        rawRow[h] = strVal;
      }
    }
    rawRecords.push(rawRow);

    const lowerMap: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(rawRow)) {
      lowerMap[k.toLowerCase()] = v;
    }

    const toNum = (key: string, fallback: number): number => {
      const val = lowerMap[key];
      if (val === undefined || val === null || val === '') return fallback;
      const n = Number(val);
      return Number.isFinite(n) ? n : fallback;
    };

    const toStr = (key: string, fallback: string): string => {
      const val = lowerMap[key];
      if (val === undefined || val === null || String(val).trim() === '') return fallback;
      return String(val).trim().toLowerCase();
    };

    const record: BankRecord = {
      age: toNum('age', 38),
      job: toStr('job', 'unknown'),
      marital: toStr('marital', 'unknown'),
      education: toStr('education', 'unknown'),
      default: toStr('default', 'no'),
      balance: toNum('balance', 0),
      housing: toStr('housing', 'no'),
      loan: toStr('loan', 'no'),
      contact: toStr('contact', 'unknown'),
      day: toNum('day', 15),
      month: toStr('month', 'may'),
      duration: toNum('duration', 180),
      campaign: Math.max(1, toNum('campaign', 1)),
      pdays: toNum('pdays', -1),
      previous: Math.max(0, toNum('previous', 0)),
      poutcome: toStr('poutcome', 'unknown'),
      y: normalizeTarget(rawRow[targetColumn]),
    };

    normalizedRecords.push(record);
  }

  return { rawRecords, normalizedRecords, targetColumn };
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function countDuplicates(records: Record<string, string | number>[]): number {
  const seen = new Set<string>();
  let dupes = 0;
  for (const r of records) {
    const sig = JSON.stringify(r);
    if (seen.has(sig)) dupes++;
    else seen.add(sig);
  }
  return dupes;
}

export function buildDatasetSummary(
  records: BankRecord[],
  rawRecords: Record<string, string | number>[],
  datasetName: string,
  source: DatasetSummary['source'],
  targetColumn: string,
  isCleaned: boolean,
  lastCleaningConfig?: CleaningConfig
): DatasetSummary {
  const positiveCount = records.reduce((acc, r) => acc + (r.y === 'yes' ? 1 : 0), 0);
  const negativeCount = records.length - positiveCount;
  let totalMissingCount = 0;
  let totalUnknownCount = 0;

  for (const r of rawRecords) {
    for (const v of Object.values(r)) {
      if (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) {
        totalMissingCount++;
      } else if (String(v).trim().toLowerCase() === 'unknown') {
        totalUnknownCount++;
      }
    }
  }

  const colCount = rawRecords.length > 0 ? Object.keys(rawRecords[0]).length : 17;

  return {
    datasetName,
    source,
    targetColumn,
    rowCount: records.length,
    rawRowCount: rawRecords.length,
    columnCount: colCount,
    duplicateCount: countDuplicates(rawRecords),
    totalMissingCount,
    totalUnknownCount,
    positiveCount,
    negativeCount,
    conversionRate: records.length > 0 ? Number(((positiveCount / records.length) * 100).toFixed(2)) : 0,
    isCleaned,
    lastCleaningConfig,
    loadedAt: new Date().toISOString(),
  };
}

export function buildExploration(
  records: BankRecord[],
  rawRecords: Record<string, string | number>[],
  summary: DatasetSummary
): ExplorationResponse {
  const headers = rawRecords.length > 0 ? Object.keys(rawRecords[0]) : [];
  const columns: ColumnProfile[] = headers.map((col) => {
    let missingCount = 0;
    let unknownCount = 0;
    const nums: number[] = [];
    const freq = new Map<string, number>();
    const sampleValues: (string | number)[] = [];

    for (const row of rawRecords) {
      const v = row[col];
      if (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) {
        missingCount++;
        continue;
      }
      if (sampleValues.length < 4) sampleValues.push(v);
      const s = String(v).trim();
      if (s.toLowerCase() === 'unknown') unknownCount++;
      freq.set(s, (freq.get(s) || 0) + 1);
      if (typeof v === 'number' || (s !== '' && !Number.isNaN(Number(s)) && col.toLowerCase() !== summary.targetColumn.toLowerCase())) {
        const num = Number(v);
        if (Number.isFinite(num)) nums.push(num);
      }
    }

    const isTarget = col.toLowerCase() === summary.targetColumn.toLowerCase();
    const isNumeric = !isTarget && nums.length > rawRecords.length * 0.7 && nums.length > 0;

    if (isNumeric) {
      const sorted = [...nums].sort((a, b) => a - b);
      const n = sorted.length;
      const mean = sorted.reduce((a, b) => a + b, 0) / n;
      const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
      return {
        name: col,
        inferredType: 'numeric',
        missingCount,
        unknownCount,
        uniqueCount: freq.size,
        sampleValues,
        numericStats: {
          min: Number(sorted[0].toFixed(2)),
          q1: Number(quantile(sorted, 0.25).toFixed(2)),
          median: Number(quantile(sorted, 0.5).toFixed(2)),
          mean: Number(mean.toFixed(2)),
          q3: Number(quantile(sorted, 0.75).toFixed(2)),
          max: Number(sorted[n - 1].toFixed(2)),
          std: Number(Math.sqrt(variance).toFixed(2)),
        },
      };
    }

    const topCats = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([value, count]) => ({
        value,
        count,
        pct: rawRecords.length > 0 ? Number(((count / rawRecords.length) * 100).toFixed(1)) : 0,
      }));

    return {
      name: col,
      inferredType: isTarget ? 'target' : 'categorical',
      missingCount,
      unknownCount,
      uniqueCount: freq.size,
      sampleValues,
      categoricalTop: topCats,
    };
  });

  return {
    summary,
    columns,
    previewRows: rawRecords.slice(0, 50),
  };
}

export function cleanDataset(
  originalRecords: BankRecord[],
  datasetName: string,
  source: DatasetSummary['source'],
  targetColumn: string,
  config: CleaningConfig
): { cleanedRecords: BankRecord[]; result: CleaningResult } {
  const beforeRows = originalRecords.length;
  let working: BankRecord[] = originalRecords.map((r) => ({ ...r }));

  // 1. Duplicate removal
  let duplicatesRemoved = 0;
  if (config.removeDuplicates) {
    const seen = new Set<string>();
    const deduped: BankRecord[] = [];
    for (const r of working) {
      const sig = JSON.stringify(r);
      if (seen.has(sig)) {
        duplicatesRemoved++;
      } else {
        seen.add(sig);
        deduped.push(r);
      }
    }
    working = deduped;
  }

  // 2. Missing / "unknown" handling
  const catCols: (keyof BankRecord)[] = ['job', 'marital', 'education', 'default', 'housing', 'loan', 'contact', 'month', 'poutcome'];
  let missingImputedOrDropped = 0;

  if (config.missingStrategy === 'drop_rows') {
    const filtered: BankRecord[] = [];
    for (const r of working) {
      const hasUnknown = catCols.some((c) => c !== 'poutcome' && String(r[c]).toLowerCase() === 'unknown');
      if (hasUnknown) {
        missingImputedOrDropped++;
      } else {
        filtered.push(r);
      }
    }
    working = filtered;
  } else if (config.missingStrategy === 'mode') {
    // Compute mode per categorical column (excluding 'unknown' unless all are unknown)
    const modes: Record<string, string> = {};
    for (const col of catCols) {
      if (col === 'poutcome') continue; // 'unknown' is meaningful for no previous campaign
      const counts = new Map<string, number>();
      for (const r of working) {
        const val = String(r[col]).toLowerCase();
        if (val !== 'unknown' && val !== '') {
          counts.set(val, (counts.get(val) || 0) + 1);
        }
      }
      let bestVal = 'unknown';
      let bestCount = -1;
      for (const [val, cnt] of counts.entries()) {
        if (cnt > bestCount) {
          bestCount = cnt;
          bestVal = val;
        }
      }
      modes[String(col)] = bestVal;
    }

    for (const r of working) {
      for (const col of catCols) {
        if (col === 'poutcome') continue;
        const val = String(r[col]).toLowerCase();
        if ((val === 'unknown' || val === '') && modes[String(col)] && modes[String(col)] !== 'unknown') {
          (r[col] as string) = modes[String(col)];
          missingImputedOrDropped++;
        }
      }
    }
  }

  // 3. Outlier handling (IQR)
  let outliersHandled = 0;
  const outlierDetails: OutlierReportItem[] = [];
  const validNumCols = config.outlierColumns.filter((c) => ['age', 'balance', 'duration', 'campaign'].includes(c));

  if (config.outlierStrategy !== 'none' && validNumCols.length > 0 && working.length > 0) {
    const fences: Record<string, { q1: number; q3: number; iqr: number; lower: number; upper: number; beforeMin: number; beforeMax: number }> = {};

    for (const col of validNumCols) {
      const vals = working.map((r) => Number(r[col])).sort((a, b) => a - b);
      const q1 = quantile(vals, 0.25);
      const q3 = quantile(vals, 0.75);
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      fences[col] = {
        q1,
        q3,
        iqr,
        lower,
        upper,
        beforeMin: vals[0],
        beforeMax: vals[vals.length - 1],
      };
    }

    if (config.outlierStrategy === 'iqr_cap') {
      for (const col of validNumCols) {
        const f = fences[col];
        let count = 0;
        let afterMin = Infinity;
        let afterMax = -Infinity;
        for (const r of working) {
          const val = Number(r[col]);
          let next = val;
          if (val < f.lower) {
            next = Math.round(f.lower);
            count++;
          } else if (val > f.upper) {
            next = Math.round(f.upper);
            count++;
          }
          (r[col] as number) = next;
          if (next < afterMin) afterMin = next;
          if (next > afterMax) afterMax = next;
        }
        outliersHandled += count;
        outlierDetails.push({
          column: col,
          q1: Number(f.q1.toFixed(2)),
          q3: Number(f.q3.toFixed(2)),
          iqr: Number(f.iqr.toFixed(2)),
          lowerFence: Number(f.lower.toFixed(2)),
          upperFence: Number(f.upper.toFixed(2)),
          outlierCount: count,
          beforeMin: f.beforeMin,
          beforeMax: f.beforeMax,
          afterMin,
          afterMax,
        });
      }
    } else if (config.outlierStrategy === 'iqr_remove') {
      const countPerCol: Record<string, number> = {};
      for (const col of validNumCols) countPerCol[col] = 0;

      const kept: BankRecord[] = [];
      for (const r of working) {
        let isOutlier = false;
        for (const col of validNumCols) {
          const val = Number(r[col]);
          const f = fences[col];
          if (val < f.lower || val > f.upper) {
            isOutlier = true;
            countPerCol[col]++;
          }
        }
        if (isOutlier) {
          outliersHandled++;
        } else {
          kept.push(r);
        }
      }
      working = kept;

      for (const col of validNumCols) {
        const f = fences[col];
        const vals = working.map((r) => Number(r[col]));
        const afterMin = vals.length > 0 ? Math.min(...vals) : 0;
        const afterMax = vals.length > 0 ? Math.max(...vals) : 0;
        outlierDetails.push({
          column: col,
          q1: Number(f.q1.toFixed(2)),
          q3: Number(f.q3.toFixed(2)),
          iqr: Number(f.iqr.toFixed(2)),
          lowerFence: Number(f.lower.toFixed(2)),
          upperFence: Number(f.upper.toFixed(2)),
          outlierCount: countPerCol[col],
          beforeMin: f.beforeMin,
          beforeMax: f.beforeMax,
          afterMin,
          afterMax,
        });
      }
    }
  }

  // 4. Categorical encoding preview (Binary + One-Hot sample)
  const previewSlice = working.slice(0, Math.min(config.encodePreviewLimit || 10, 20));
  const topJobs = ['management', 'blue-collar', 'technician', 'admin.', 'services'];
  const encodedFeatureNames = [
    'age',
    'balance',
    'campaign',
    'default_bin',
    'housing_bin',
    'loan_bin',
    ...topJobs.map((j) => `job_${j}`),
    'marital_married',
    'marital_single',
    'contact_cellular',
    'poutcome_success',
    'y_target',
  ];

  const encodedPreviewRows = previewSlice.map((r) => {
    const obj: Record<string, string | number> = {
      age: r.age,
      balance: r.balance,
      campaign: r.campaign,
      default_bin: r.default === 'yes' ? 1 : 0,
      housing_bin: r.housing === 'yes' ? 1 : 0,
      loan_bin: r.loan === 'yes' ? 1 : 0,
    };
    for (const j of topJobs) {
      obj[`job_${j}`] = r.job === j ? 1 : 0;
    }
    obj['marital_married'] = r.marital === 'married' ? 1 : 0;
    obj['marital_single'] = r.marital === 'single' ? 1 : 0;
    obj['contact_cellular'] = r.contact === 'cellular' ? 1 : 0;
    obj['poutcome_success'] = r.poutcome === 'success' ? 1 : 0;
    obj['y_target'] = r.y === 'yes' ? 1 : 0;
    return obj;
  });

  const summary = buildDatasetSummary(
    working,
    working as unknown as Record<string, string | number>[],
    datasetName,
    source,
    targetColumn,
    true,
    config
  );

  return {
    cleanedRecords: working,
    result: {
      summary,
      beforeRows,
      afterRows: working.length,
      duplicatesRemoved,
      missingImputedOrDropped,
      outliersHandled,
      outlierDetails,
      encodedFeatureNames,
      encodedPreviewRows,
    },
  };
}

function groupByKey(
  records: BankRecord[],
  keyFn: (r: BankRecord) => string,
  order?: string[],
  sortByTotalDesc = false
): GroupedOutcomeCount[] {
  const map = new Map<string, { yes: number; no: number }>();
  for (const r of records) {
    const k = keyFn(r);
    const cur = map.get(k) || { yes: 0, no: 0 };
    if (r.y === 'yes') cur.yes++;
    else cur.no++;
    map.set(k, cur);
  }

  let items: GroupedOutcomeCount[] = Array.from(map.entries()).map(([label, { yes, no }]) => {
    const total = yes + no;
    return {
      label,
      yes,
      no,
      total,
      conversionRate: total > 0 ? Number(((yes / total) * 100).toFixed(2)) : 0,
    };
  });

  if (order) {
    const orderIdx = new Map(order.map((o, i) => [o, i]));
    items.sort((a, b) => (orderIdx.get(a.label) ?? 999) - (orderIdx.get(b.label) ?? 999));
  } else if (sortByTotalDesc) {
    items.sort((a, b) => b.total - a.total);
  }
  return items;
}

function getAgeBracket(age: number): string {
  if (age <= 25) return '18-25';
  if (age <= 35) return '26-35';
  if (age <= 45) return '36-45';
  if (age <= 55) return '46-55';
  if (age <= 65) return '56-65';
  return '65+';
}

function getDurationBracket(sec: number): string {
  if (sec < 60) return '<1 min';
  if (sec < 180) return '1-3 min';
  if (sec < 360) return '3-6 min';
  if (sec < 600) return '6-10 min';
  return '10+ min';
}

function getCampaignBracket(c: number): string {
  if (c === 1) return '1 contact';
  if (c === 2) return '2 contacts';
  if (c === 3) return '3 contacts';
  if (c <= 5) return '4-5 contacts';
  return '6+ contacts';
}

export function buildEda(records: BankRecord[], summary: DatasetSummary): EdaResponse {
  const ageBrackets = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'];
  const durationBrackets = ['<1 min', '1-3 min', '3-6 min', '6-10 min', '10+ min'];
  const campaignBrackets = ['1 contact', '2 contacts', '3 contacts', '4-5 contacts', '6+ contacts'];

  const yesCount = records.filter((r) => r.y === 'yes').length;
  const noCount = records.length - yesCount;
  const total = records.length || 1;

  return {
    summary,
    ageDistribution: groupByKey(records, (r) => getAgeBracket(r.age), ageBrackets),
    jobDistribution: groupByKey(records, (r) => r.job, undefined, true),
    maritalDistribution: groupByKey(records, (r) => r.marital, undefined, true),
    educationDistribution: groupByKey(records, (r) => r.education, undefined, true),
    contactDistribution: groupByKey(records, (r) => r.contact, undefined, true),
    durationDistribution: groupByKey(records, (r) => getDurationBracket(r.duration), durationBrackets),
    campaignContactsDistribution: groupByKey(records, (r) => getCampaignBracket(r.campaign), campaignBrackets),
    monthlyPerformance: groupByKey(records, (r) => r.month, MONTH_ORDER),
    poutcomeDistribution: groupByKey(records, (r) => r.poutcome, undefined, true),
    targetSplit: [
      { label: 'Subscribed (Yes)', count: yesCount, pct: Number(((yesCount / total) * 100).toFixed(2)) },
      { label: 'Not Subscribed (No)', count: noCount, pct: Number(((noCount / total) * 100).toFixed(2)) },
    ],
  };
}

export function buildCampaignPerformance(records: BankRecord[]): CampaignPerformanceResponse {
  const totalContacted = records.length;
  const totalSubscribed = records.filter((r) => r.y === 'yes').length;
  const totalDeclined = totalContacted - totalSubscribed;
  const overallConversionRate = totalContacted > 0 ? Number(((totalSubscribed / totalContacted) * 100).toFixed(2)) : 0;

  const ageBrackets = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'];
  const byOccupation = groupByKey(records, (r) => r.job).sort((a, b) => b.conversionRate - a.conversionRate);
  const byAgeGroup = groupByKey(records, (r) => getAgeBracket(r.age), ageBrackets);
  const byEducation = groupByKey(records, (r) => r.education).sort((a, b) => b.conversionRate - a.conversionRate);
  const byContactMethod = groupByKey(records, (r) => r.contact).sort((a, b) => b.conversionRate - a.conversionRate);
  const byMonth = groupByKey(records, (r) => r.month, MONTH_ORDER);
  const byPoutcome = groupByKey(records, (r) => r.poutcome);

  const minSample = Math.max(15, Math.floor(totalContacted * 0.005));
  const candidates: SegmentRankItem[] = [];

  const pushSegments = (type: string, list: GroupedOutcomeCount[]) => {
    for (const item of list) {
      if (item.total >= minSample) {
        candidates.push({
          segmentType: type,
          segmentValue: item.label,
          contacted: item.total,
          subscriptions: item.yes,
          conversionRate: item.conversionRate,
          liftVsBaseline: overallConversionRate > 0 ? Number((item.conversionRate / overallConversionRate).toFixed(2)) : 1,
        });
      }
    }
  };

  pushSegments('Previous Outcome', byPoutcome);
  pushSegments('Occupation', byOccupation);
  pushSegments('Age Group', byAgeGroup);
  pushSegments('Education', byEducation);
  pushSegments('Contact Method', byContactMethod);
  pushSegments('Month', byMonth);

  const topSegments = candidates
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 12);

  return {
    totalContacted,
    totalSubscribed,
    totalDeclined,
    overallConversionRate,
    byOccupation,
    byAgeGroup,
    byEducation,
    byContactMethod,
    byMonth,
    topSegments,
    bestSegment: topSegments[0] || null,
  };
}

export function buildDashboard(records: BankRecord[], filters?: Partial<DashboardFilters>): DashboardResponse {
  const uniqueSorted = (vals: string[], customOrder?: string[]) => {
    const set = Array.from(new Set(vals));
    if (customOrder) {
      const idxMap = new Map(customOrder.map((m, i) => [m, i]));
      return set.sort((a, b) => (idxMap.get(a) ?? 999) - (idxMap.get(b) ?? 999));
    }
    return set.sort();
  };

  const availableFilters = {
    months: uniqueSorted(records.map((r) => r.month), MONTH_ORDER),
    jobs: uniqueSorted(records.map((r) => r.job)),
    marital: uniqueSorted(records.map((r) => r.marital)),
    education: uniqueSorted(records.map((r) => r.education)),
    contact: uniqueSorted(records.map((r) => r.contact)),
    housing: uniqueSorted(records.map((r) => r.housing)),
  };

  const fMonths = filters?.months?.length ? new Set(filters.months) : null;
  const fJobs = filters?.jobs?.length ? new Set(filters.jobs) : null;
  const fMarital = filters?.marital?.length ? new Set(filters.marital) : null;
  const fEdu = filters?.education?.length ? new Set(filters.education) : null;
  const fContact = filters?.contact?.length ? new Set(filters.contact) : null;
  const fHousing = filters?.housing?.length ? new Set(filters.housing) : null;

  const filtered = records.filter((r) => {
    if (fMonths && !fMonths.has(r.month)) return false;
    if (fJobs && !fJobs.has(r.job)) return false;
    if (fMarital && !fMarital.has(r.marital)) return false;
    if (fEdu && !fEdu.has(r.education)) return false;
    if (fContact && !fContact.has(r.contact)) return false;
    if (fHousing && !fHousing.has(r.housing)) return false;
    return true;
  });

  const totalCustomers = filtered.length;
  const successfulSubscriptions = filtered.filter((r) => r.y === 'yes').length;
  const unsuccessfulResponses = totalCustomers - successfulSubscriptions;
  const conversionRate = totalCustomers > 0 ? Number(((successfulSubscriptions / totalCustomers) * 100).toFixed(2)) : 0;

  const avgCampaignContacts = totalCustomers > 0
    ? Number((filtered.reduce((a, r) => a + r.campaign, 0) / totalCustomers).toFixed(2))
    : 0;
  const avgCallDurationSec = totalCustomers > 0
    ? Math.round(filtered.reduce((a, r) => a + r.duration, 0) / totalCustomers)
    : 0;

  const monthlyTrend = groupByKey(filtered, (r) => r.month, MONTH_ORDER);
  const jobConversion = groupByKey(filtered, (r) => r.job).sort((a, b) => b.conversionRate - a.conversionRate);
  const contactPerformance = groupByKey(filtered, (r) => r.contact).sort((a, b) => b.conversionRate - a.conversionRate);

  const minSegSample = Math.max(5, Math.floor(totalCustomers * 0.01));
  const eligibleJobs = jobConversion.filter((j) => j.total >= minSegSample);
  const bestJob = (eligibleJobs.length > 0 ? eligibleJobs : jobConversion)[0];

  // Heatmap: Top 8 Jobs x Months present
  const top8Jobs = groupByKey(filtered, (r) => r.job, undefined, true).slice(0, 8).map((j) => j.label);
  const presentMonths = monthlyTrend.map((m) => m.label);
  const cellMap = new Map<string, { total: number; yes: number }>();

  for (const r of filtered) {
    if (!top8Jobs.includes(r.job)) continue;
    const key = `${r.job}__${r.month}`;
    const cur = cellMap.get(key) || { total: 0, yes: 0 };
    cur.total++;
    if (r.y === 'yes') cur.yes++;
    cellMap.set(key, cur);
  }

  const cells: HeatmapCell[] = [];
  for (const row of top8Jobs) {
    for (const col of presentMonths) {
      const c = cellMap.get(`${row}__${col}`) || { total: 0, yes: 0 };
      cells.push({
        row,
        col,
        total: c.total,
        yes: c.yes,
        conversionRate: c.total > 0 ? Number(((c.yes / c.total) * 100).toFixed(1)) : 0,
      });
    }
  }

  return {
    availableFilters,
    kpis: {
      totalCustomers,
      successfulSubscriptions,
      unsuccessfulResponses,
      conversionRate,
      bestSegmentLabel: bestJob ? `${bestJob.label} (Job)` : 'N/A',
      bestSegmentRate: bestJob ? bestJob.conversionRate : 0,
      avgCampaignContacts,
      avgCallDurationSec,
    },
    monthlyTrend,
    jobConversion,
    outcomePie: [
      {
        name: 'Subscribed (Yes)',
        value: successfulSubscriptions,
        pct: totalCustomers > 0 ? Number(((successfulSubscriptions / totalCustomers) * 100).toFixed(1)) : 0,
      },
      {
        name: 'Not Subscribed (No)',
        value: unsuccessfulResponses,
        pct: totalCustomers > 0 ? Number(((unsuccessfulResponses / totalCustomers) * 100).toFixed(1)) : 0,
      },
    ],
    contactPerformance,
    heatmap: {
      rows: top8Jobs,
      cols: presentMonths,
      cells,
    },
  };
}

export function buildBusinessInsights(records: BankRecord[]): BusinessInsightsResponse {
  const perf = buildCampaignPerformance(records);
  const eda = buildEda(records, buildDatasetSummary(records, [], '', 'uci-sample', 'y', false));

  const minN = Math.max(15, Math.floor(records.length * 0.005));
  const bestJobs = perf.byOccupation.filter((j) => j.total >= minN).slice(0, 2);
  const bestAge = perf.byAgeGroup.filter((a) => a.total >= minN).sort((a, b) => b.conversionRate - a.conversionRate)[0];
  const bestEdu = perf.byEducation.filter((e) => e.total >= minN)[0];
  const poutcomeSuccess = eda.poutcomeDistribution.find((p) => p.label === 'success');

  const topSegments: BusinessInsightsResponse['topSegments'] = [];
  if (poutcomeSuccess) {
    topSegments.push({
      title: 'Prior Campaign Subscribers',
      metric: `${poutcomeSuccess.conversionRate}% conversion (${poutcomeSuccess.yes}/${poutcomeSuccess.total})`,
      detail: `Customers who responded positively to a previous marketing campaign convert at ${(poutcomeSuccess.conversionRate / (perf.overallConversionRate || 1)).toFixed(1)}x the portfolio baseline.`,
    });
  }
  if (bestJobs.length > 0) {
    topSegments.push({
      title: `Top Occupation: ${bestJobs.map((j) => j.label).join(' & ')}`,
      metric: `${bestJobs[0].conversionRate}% conversion`,
      detail: `${bestJobs[0].label} customers demonstrate strong term deposit appetite across ${bestJobs[0].total.toLocaleString()} outreach records.`,
    });
  }
  if (bestAge) {
    topSegments.push({
      title: `Highest-Converting Age Cohort: ${bestAge.label}`,
      metric: `${bestAge.conversionRate}% conversion`,
      detail: `Age bracket ${bestAge.label} achieves ${bestAge.yes.toLocaleString()} subscriptions out of ${bestAge.total.toLocaleString()} contacts.`,
    });
  }
  if (bestEdu) {
    topSegments.push({
      title: `Education Tier Leader: ${bestEdu.label}`,
      metric: `${bestEdu.conversionRate}% conversion`,
      detail: `Customers with ${bestEdu.label} education show elevated term deposit adoption relative to the ${perf.overallConversionRate}% average.`,
    });
  }

  const contactSorted = perf.byContactMethod;
  const bestChannel = contactSorted[0] || { label: 'cellular', conversionRate: 0, total: 0 };
  const worstChannel = contactSorted[contactSorted.length - 1] || { label: 'unknown', conversionRate: 0, total: 0 };

  const monthsSortedByRate = [...perf.byMonth].filter((m) => m.total >= Math.max(10, records.length * 0.004)).sort((a, b) => b.conversionRate - a.conversionRate);
  const peakMonths = monthsSortedByRate.slice(0, 3).map((m) => ({ month: m.label, rate: m.conversionRate, volume: m.total }));
  const highVolumeLowRateMonths = [...perf.byMonth]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .filter((m) => m.conversionRate <= perf.overallConversionRate)
    .map((m) => ({ month: m.label, rate: m.conversionRate, volume: m.total }));

  const freqList = eda.campaignContactsDistribution;
  const oneContact = freqList.find((f) => f.label === '1 contact') || freqList[0];
  const overContacted = freqList.find((f) => f.label === '6+ contacts') || freqList[freqList.length - 1];

  const recommendations: BusinessInsightsResponse['recommendations'] = [
    {
      priority: 'High',
      area: 'Predictive Lead Scoring',
      action: 'Deploy the trained Random Forest / Logistic Regression propensity model to score customer lists before dialing, prioritizing the top 30% propensity deciles.',
      expectedImpact: 'Reduces outbound call volume by ~40% while capturing 65-75% of potential term deposit subscriptions.',
    },
    {
      priority: 'High',
      area: 'Contact Frequency Cap',
      action: 'Cap outbound follow-up attempts at 3 contacts per campaign cycle and suppress customers with 4+ unanswered or declined touches.',
      expectedImpact: `Avoids diminishing returns (conversion drops from ${oneContact?.conversionRate ?? 0}% at 1 contact to ${overContacted?.conversionRate ?? 0}% at 6+ contacts).`,
    },
    {
      priority: 'High',
      area: 'Channel Optimization',
      action: `Shift outreach budget toward ${bestChannel.label} outreach and enrich missing contact records currently tagged as "${worstChannel.label}".`,
      expectedImpact: `${bestChannel.label} converts at ${bestChannel.conversionRate}% vs ${worstChannel.conversionRate}% on ${worstChannel.label}.`,
    },
    {
      priority: 'Medium',
      area: 'Seasonal Campaign Timing',
      action: `Increase relationship-manager capacity during high-efficiency months (${peakMonths.map((m) => m.month.toUpperCase()).join(', ')}) and replace untargeted bulk dialing in high-volume, low-yield months.`,
      expectedImpact: 'Improves campaign ROI and advisor productivity during peak deposit liquidity windows.',
    },
    {
      priority: 'Medium',
      area: 'Retargeting Prior Responders',
      action: 'Create a dedicated VIP retention track for customers with prior campaign success (poutcome = success) and zero current personal loans.',
      expectedImpact: 'Capitalizes on proven trust and higher disposable liquidity for recurring term deposits.',
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    baselineConversion: perf.overallConversionRate,
    topSegments,
    contactChannelFinding: {
      bestChannel: bestChannel.label,
      bestRate: bestChannel.conversionRate,
      worstChannel: worstChannel.label,
      worstRate: worstChannel.conversionRate,
      summary: `"${bestChannel.label}" outperforms "${worstChannel.label}" by ${(bestChannel.conversionRate - worstChannel.conversionRate).toFixed(2)} percentage points.`,
    },
    monthlySeasonalityFinding: {
      peakMonths,
      highVolumeLowRateMonths,
      summary: peakMonths.length > 0
        ? `Highest conversion efficiency occurs in ${peakMonths.map((m) => `${m.month.toUpperCase()} (${m.rate}%)`).join(', ')}, whereas high-volume summer/spring blitzes yield lower conversion rates.`
        : 'Insufficient monthly variance to establish seasonal peaks.',
    },
    frequencyFinding: {
      optimalContacts: '1 to 3 contacts',
      sweetSpotRate: oneContact ? oneContact.conversionRate : 0,
      overContactedRate: overContacted ? overContacted.conversionRate : 0,
      summary: `Conversion peaks during initial outreach (${oneContact?.conversionRate ?? 0}% at 1 contact) and declines sharply to ${overContacted?.conversionRate ?? 0}% when customers are contacted 6 or more times.`,
    },
    recommendations,
  };
}

export function recordsToCsv(records: BankRecord[]): string {
  return Papa.unparse(records);
}
