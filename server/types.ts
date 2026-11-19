export type TargetValue = 'yes' | 'no';

export interface BankRecord {
  age: number;
  job: string;
  marital: string;
  education: string;
  default: string;
  balance: number;
  housing: string;
  loan: string;
  contact: string;
  day: number;
  month: string;
  duration: number;
  campaign: number;
  pdays: number;
  previous: number;
  poutcome: string;
  y: TargetValue;
  [key: string]: string | number;
}

export interface ColumnProfile {
  name: string;
  inferredType: 'numeric' | 'categorical' | 'target';
  missingCount: number;
  unknownCount: number;
  uniqueCount: number;
  sampleValues: (string | number)[];
  numericStats?: {
    min: number;
    q1: number;
    median: number;
    mean: number;
    q3: number;
    max: number;
    std: number;
  };
  categoricalTop?: { value: string; count: number; pct: number }[];
}

export interface DatasetSummary {
  datasetName: string;
  source: 'uci-sample' | 'uci-full' | 'uci-downloaded' | 'uploaded';
  targetColumn: string;
  rowCount: number;
  rawRowCount: number;
  columnCount: number;
  duplicateCount: number;
  totalMissingCount: number;
  totalUnknownCount: number;
  positiveCount: number;
  negativeCount: number;
  conversionRate: number;
  isCleaned: boolean;
  lastCleaningConfig?: CleaningConfig;
  loadedAt: string;
}

export interface ExplorationResponse {
  summary: DatasetSummary;
  columns: ColumnProfile[];
  previewRows: Record<string, string | number>[];
}

export interface CleaningConfig {
  missingStrategy: 'mode' | 'keep_unknown' | 'drop_rows';
  removeDuplicates: boolean;
  outlierStrategy: 'none' | 'iqr_cap' | 'iqr_remove';
  outlierColumns: string[];
  encodePreviewLimit: number;
}

export interface OutlierReportItem {
  column: string;
  q1: number;
  q3: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  outlierCount: number;
  beforeMin: number;
  beforeMax: number;
  afterMin: number;
  afterMax: number;
}

export interface CleaningResult {
  summary: DatasetSummary;
  beforeRows: number;
  afterRows: number;
  duplicatesRemoved: number;
  missingImputedOrDropped: number;
  outliersHandled: number;
  outlierDetails: OutlierReportItem[];
  encodedFeatureNames: string[];
  encodedPreviewRows: Record<string, string | number>[];
}

export interface GroupedOutcomeCount {
  label: string;
  yes: number;
  no: number;
  total: number;
  conversionRate: number;
}

export interface EdaResponse {
  summary: DatasetSummary;
  ageDistribution: GroupedOutcomeCount[];
  jobDistribution: GroupedOutcomeCount[];
  maritalDistribution: GroupedOutcomeCount[];
  educationDistribution: GroupedOutcomeCount[];
  contactDistribution: GroupedOutcomeCount[];
  durationDistribution: GroupedOutcomeCount[];
  campaignContactsDistribution: GroupedOutcomeCount[];
  monthlyPerformance: GroupedOutcomeCount[];
  poutcomeDistribution: GroupedOutcomeCount[];
  targetSplit: { label: string; count: number; pct: number }[];
}

export interface SegmentRankItem {
  segmentType: string;
  segmentValue: string;
  contacted: number;
  subscriptions: number;
  conversionRate: number;
  liftVsBaseline: number;
}

export interface CampaignPerformanceResponse {
  totalContacted: number;
  totalSubscribed: number;
  totalDeclined: number;
  overallConversionRate: number;
  byOccupation: GroupedOutcomeCount[];
  byAgeGroup: GroupedOutcomeCount[];
  byEducation: GroupedOutcomeCount[];
  byContactMethod: GroupedOutcomeCount[];
  byMonth: GroupedOutcomeCount[];
  topSegments: SegmentRankItem[];
  bestSegment: SegmentRankItem | null;
}

export interface DashboardFilters {
  months: string[];
  jobs: string[];
  marital: string[];
  education: string[];
  contact: string[];
  housing: string[];
}

export interface HeatmapCell {
  row: string;
  col: string;
  total: number;
  yes: number;
  conversionRate: number;
}

export interface DashboardResponse {
  availableFilters: {
    months: string[];
    jobs: string[];
    marital: string[];
    education: string[];
    contact: string[];
    housing: string[];
  };
  kpis: {
    totalCustomers: number;
    successfulSubscriptions: number;
    unsuccessfulResponses: number;
    conversionRate: number;
    bestSegmentLabel: string;
    bestSegmentRate: number;
    avgCampaignContacts: number;
    avgCallDurationSec: number;
  };
  monthlyTrend: GroupedOutcomeCount[];
  jobConversion: GroupedOutcomeCount[];
  outcomePie: { name: string; value: number; pct: number }[];
  contactPerformance: GroupedOutcomeCount[];
  heatmap: {
    rows: string[];
    cols: string[];
    cells: HeatmapCell[];
  };
}

export interface MLTrainConfig {
  testSize: number;
  handleImbalance: boolean;
  excludeDuration: boolean;
  maxRows?: number;
}

export interface RocPoint {
  fpr: number;
  tpr: number;
  threshold: number;
}

export interface ConfusionMatrix {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

export interface MLModelMetrics {
  modelKey: 'logistic_regression' | 'decision_tree' | 'random_forest';
  modelName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  trainTimeMs: number;
  confusionMatrix: ConfusionMatrix;
  rocCurve: RocPoint[];
  featureImportances: FeatureImportanceItem[];
}

export interface MLComparisonResponse {
  trainedAt: string;
  config: MLTrainConfig;
  datasetRowsUsed: number;
  trainRows: number;
  testRows: number;
  positiveRatioTrain: number;
  positiveRatioTest: number;
  featureCount: number;
  bestModelKey: 'logistic_regression' | 'decision_tree' | 'random_forest';
  bestModelName: string;
  models: MLModelMetrics[];
  modelSavedPath: string;
}

export interface PredictionInput {
  age: number;
  job: string;
  marital: string;
  education: string;
  default: string;
  balance: number;
  housing: string;
  loan: string;
  contact: string;
  month: string;
  campaign: number;
  poutcome: string;
  previous?: number;
  duration?: number;
}

export interface PredictionContribution {
  factor: string;
  impact: number;
  direction: 'positive' | 'negative';
}

export interface PredictionOutput {
  willSubscribe: boolean;
  probability: number;
  confidenceLabel: 'High Propensity' | 'Moderate Propensity' | 'Low Propensity';
  modelUsed: string;
  excludeDurationUsed: boolean;
  contributions: PredictionContribution[];
  disclaimer: string;
}

export interface BusinessInsightsResponse {
  generatedAt: string;
  baselineConversion: number;
  topSegments: {
    title: string;
    metric: string;
    detail: string;
  }[];
  contactChannelFinding: {
    bestChannel: string;
    bestRate: number;
    worstChannel: string;
    worstRate: number;
    summary: string;
  };
  monthlySeasonalityFinding: {
    peakMonths: { month: string; rate: number; volume: number }[];
    highVolumeLowRateMonths: { month: string; rate: number; volume: number }[];
    summary: string;
  };
  frequencyFinding: {
    optimalContacts: string;
    sweetSpotRate: number;
    overContactedRate: number;
    summary: string;
  };
  recommendations: {
    priority: 'High' | 'Medium';
    area: string;
    action: string;
    expectedImpact: string;
  }[];
}
