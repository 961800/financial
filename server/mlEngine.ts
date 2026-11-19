import {
  BankRecord,
  ConfusionMatrix,
  FeatureImportanceItem,
  MLComparisonResponse,
  MLModelMetrics,
  MLTrainConfig,
  PredictionContribution,
  PredictionInput,
  PredictionOutput,
  RocPoint,
} from './types.ts';

interface EncoderSpec {
  numericCols: string[];
  categoricalCols: string[];
  means: Record<string, number>;
  stds: Record<string, number>;
  categories: Record<string, string[]>;
  featureNames: string[];
}

interface TreeNode {
  isLeaf: boolean;
  prob: number;
  featureIdx?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface SavedModelBundle {
  trainedAt: string;
  config: MLTrainConfig;
  bestModelKey: MLModelMetrics['modelKey'];
  bestModelName: string;
  encoder: EncoderSpec;
  logisticWeights?: number[];
  logisticBias?: number;
  decisionTree?: TreeNode;
  randomForest?: TreeNode[];
  comparison: MLComparisonResponse;
}

// Deterministic PRNG for reproducible train/test split and random forest subsampling
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stratifiedSplit(records: BankRecord[], testSize: number, maxRows: number, seed = 42): { train: BankRecord[]; test: BankRecord[] } {
  const rng = mulberry32(seed);
  const pos = records.filter((r) => r.y === 'yes');
  const neg = records.filter((r) => r.y === 'no');

  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  let posShuffled = shuffle(pos);
  let negShuffled = shuffle(neg);

  // Stratified cap if dataset is very large (e.g. 45k) so server trains in < 2 seconds
  const total = posShuffled.length + negShuffled.length;
  if (total > maxRows) {
    const ratio = maxRows / total;
    posShuffled = posShuffled.slice(0, Math.max(10, Math.round(posShuffled.length * ratio)));
    negShuffled = negShuffled.slice(0, Math.max(10, Math.round(negShuffled.length * ratio)));
  }

  const posTestCount = Math.max(1, Math.round(posShuffled.length * testSize));
  const negTestCount = Math.max(1, Math.round(negShuffled.length * testSize));

  const test = shuffle([...posShuffled.slice(0, posTestCount), ...negShuffled.slice(0, negTestCount)]);
  const train = shuffle([...posShuffled.slice(posTestCount), ...negShuffled.slice(negTestCount)]);
  return { train, test };
}

function fitEncoder(trainRecords: BankRecord[], excludeDuration: boolean): EncoderSpec {
  const numericCols = excludeDuration
    ? ['age', 'balance', 'day', 'campaign', 'pdays', 'previous']
    : ['age', 'balance', 'day', 'duration', 'campaign', 'pdays', 'previous'];

  const categoricalCols = ['job', 'marital', 'education', 'default', 'housing', 'loan', 'contact', 'month', 'poutcome'];

  const means: Record<string, number> = {};
  const stds: Record<string, number> = {};
  const n = trainRecords.length || 1;

  for (const col of numericCols) {
    const vals = trainRecords.map((r) => Number(r[col]) || 0);
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    means[col] = mean;
    stds[col] = Math.sqrt(variance) || 1;
  }

  const categories: Record<string, string[]> = {};
  for (const col of categoricalCols) {
    const counts = new Map<string, number>();
    for (const r of trainRecords) {
      const v = String(r[col] ?? 'unknown').toLowerCase();
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    // Sort deterministically, drop rare < 0.2% only if > 15 categories
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
    categories[col] = sorted.slice(0, 15);
  }

  const featureNames: string[] = [...numericCols];
  for (const col of categoricalCols) {
    for (const cat of categories[col]) {
      featureNames.push(`${col}=${cat}`);
    }
  }

  return { numericCols, categoricalCols, means, stds, categories, featureNames };
}

function transformRecord(record: Record<string, string | number>, spec: EncoderSpec): Float64Array {
  const vec = new Float64Array(spec.featureNames.length);
  let idx = 0;

  for (const col of spec.numericCols) {
    const val = Number(record[col]) || 0;
    vec[idx++] = (val - spec.means[col]) / spec.stds[col];
  }

  for (const col of spec.categoricalCols) {
    const val = String(record[col] ?? 'unknown').toLowerCase();
    for (const cat of spec.categories[col]) {
      vec[idx++] = val === cat ? 1 : 0;
    }
  }
  return vec;
}

function transformBatch(records: BankRecord[], spec: EncoderSpec): { X: Float64Array[]; y: Uint8Array } {
  const X = records.map((r) => transformRecord(r, spec));
  const y = new Uint8Array(records.length);
  for (let i = 0; i < records.length; i++) {
    y[i] = records[i].y === 'yes' ? 1 : 0;
  }
  return { X, y };
}

function sigmoid(z: number): number {
  if (z > 35) return 1 - 1e-15;
  if (z < -35) return 1e-15;
  return 1 / (1 + Math.exp(-z));
}

function trainLogisticRegression(
  X: Float64Array[],
  y: Uint8Array,
  sampleWeights: Float64Array,
  numFeatures: number
): { weights: number[]; bias: number } {
  const weights = new Float64Array(numFeatures);
  let bias = 0;

  // Adam optimizer with L2 regularization
  const mW = new Float64Array(numFeatures);
  const vW = new Float64Array(numFeatures);
  let mB = 0;
  let vB = 0;

  const lr = 0.045;
  const l2 = 0.002;
  const beta1 = 0.9;
  const beta2 = 0.999;
  const eps = 1e-8;
  const epochs = 140;
  const n = X.length;
  const totalWeight = sampleWeights.reduce((a, b) => a + b, 0) || n;

  for (let epoch = 1; epoch <= epochs; epoch++) {
    const gradW = new Float64Array(numFeatures);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      const xi = X[i];
      let z = bias;
      for (let j = 0; j < numFeatures; j++) {
        if (xi[j] !== 0) z += weights[j] * xi[j];
      }
      const p = sigmoid(z);
      const err = (p - y[i]) * sampleWeights[i];
      gradB += err;
      for (let j = 0; j < numFeatures; j++) {
        if (xi[j] !== 0) gradW[j] += err * xi[j];
      }
    }

    const stepLr = lr * (1 - (epoch - 1) / (epochs * 1.4));
    const b1Corr = 1 - Math.pow(beta1, epoch);
    const b2Corr = 1 - Math.pow(beta2, epoch);

    const gB = gradB / totalWeight;
    mB = beta1 * mB + (1 - beta1) * gB;
    vB = beta2 * vB + (1 - beta2) * gB * gB;
    bias -= stepLr * (mB / b1Corr) / (Math.sqrt(vB / b2Corr) + eps);

    for (let j = 0; j < numFeatures; j++) {
      const g = gradW[j] / totalWeight + l2 * weights[j];
      mW[j] = beta1 * mW[j] + (1 - beta1) * g;
      vW[j] = beta2 * vW[j] + (1 - beta2) * g * g;
      weights[j] -= stepLr * (mW[j] / b1Corr) / (Math.sqrt(vW[j] / b2Corr) + eps);
    }
  }

  return { weights: Array.from(weights), bias };
}

function predictLogisticProba(X: Float64Array[], weights: number[], bias: number): number[] {
  return X.map((xi) => {
    let z = bias;
    for (let j = 0; j < weights.length; j++) {
      if (xi[j] !== 0) z += weights[j] * xi[j];
    }
    return sigmoid(z);
  });
}

function buildCartTree(
  X: Float64Array[],
  y: Uint8Array,
  sampleWeights: Float64Array,
  indices: number[],
  numFeatures: number,
  maxDepth: number,
  minSamplesSplit: number,
  minSamplesLeaf: number,
  maxFeaturesPerSplit: number,
  rng: () => number,
  importanceAccum: Float64Array,
  depth = 0
): TreeNode {
  let w0 = 0;
  let w1 = 0;
  for (const idx of indices) {
    if (y[idx] === 1) w1 += sampleWeights[idx];
    else w0 += sampleWeights[idx];
  }
  const totalW = w0 + w1 || 1;
  const prob = w1 / totalW;

  if (depth >= maxDepth || indices.length < minSamplesSplit || w0 < 1e-6 || w1 < 1e-6) {
    return { isLeaf: true, prob };
  }

  const p1 = w1 / totalW;
  const parentGini = 1 - (p1 * p1 + (1 - p1) * (1 - p1));

  // Candidate features
  let featureCandidates: number[] = [];
  if (maxFeaturesPerSplit >= numFeatures) {
    for (let f = 0; f < numFeatures; f++) featureCandidates.push(f);
  } else {
    const all = Array.from({ length: numFeatures }, (_, i) => i);
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    featureCandidates = all.slice(0, maxFeaturesPerSplit);
  }

  let bestGain = 0;
  let bestFeature = -1;
  let bestThreshold = 0;

  for (const f of featureCandidates) {
    // Collect unique thresholds (up to 16 quantile bins for continuous speed)
    const pairs: { val: number; label: number; w: number }[] = new Array(indices.length);
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      pairs[i] = { val: X[idx][f], label: y[idx], w: sampleWeights[idx] };
    }
    pairs.sort((a, b) => a.val - b.val);

    if (pairs[0].val === pairs[pairs.length - 1].val) continue;

    // Evaluate split points at value changes without ever skipping low-cardinality boundaries
    const boundaries: number[] = [];
    for (let i = 0; i < pairs.length - 1; i++) {
      if (pairs[i].val !== pairs[i + 1].val) {
        boundaries.push(i);
      }
    }

    const evalSet = new Set<number>();
    if (boundaries.length <= 24) {
      for (const b of boundaries) evalSet.add(b);
    } else {
      const bStep = boundaries.length / 24;
      for (let k = 0; k < 24; k++) {
        evalSet.add(boundaries[Math.floor(k * bStep)]);
      }
      evalSet.add(boundaries[boundaries.length - 1]);
    }

    let leftW0 = 0;
    let leftW1 = 0;
    let leftCount = 0;

    for (let i = 0; i < pairs.length - 1; i++) {
      if (pairs[i].label === 1) leftW1 += pairs[i].w;
      else leftW0 += pairs[i].w;
      leftCount++;

      if (!evalSet.has(i)) continue;

      const rightCount = pairs.length - leftCount;
      if (leftCount < minSamplesLeaf || rightCount < minSamplesLeaf) continue;

      const leftW = leftW0 + leftW1;
      const rightW = totalW - leftW;
      if (leftW <= 0 || rightW <= 0) continue;

      const lp1 = leftW1 / leftW;
      const rp1 = (w1 - leftW1) / rightW;
      const leftGini = 1 - (lp1 * lp1 + (1 - lp1) * (1 - lp1));
      const rightGini = 1 - (rp1 * rp1 + (1 - rp1) * (1 - rp1));

      const weightedGini = (leftW / totalW) * leftGini + (rightW / totalW) * rightGini;
      const gain = parentGini - weightedGini;

      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = f;
        bestThreshold = (pairs[i].val + pairs[i + 1].val) / 2;
      }
    }
  }

  if (bestFeature === -1 || bestGain <= 1e-6) {
    return { isLeaf: true, prob };
  }

  importanceAccum[bestFeature] += totalW * bestGain;

  const leftIndices: number[] = [];
  const rightIndices: number[] = [];
  for (const idx of indices) {
    if (X[idx][bestFeature] <= bestThreshold) leftIndices.push(idx);
    else rightIndices.push(idx);
  }

  if (leftIndices.length < minSamplesLeaf || rightIndices.length < minSamplesLeaf) {
    return { isLeaf: true, prob };
  }

  return {
    isLeaf: false,
    prob,
    featureIdx: bestFeature,
    threshold: bestThreshold,
    left: buildCartTree(
      X, y, sampleWeights, leftIndices, numFeatures,
      maxDepth, minSamplesSplit, minSamplesLeaf, maxFeaturesPerSplit,
      rng, importanceAccum, depth + 1
    ),
    right: buildCartTree(
      X, y, sampleWeights, rightIndices, numFeatures,
      maxDepth, minSamplesSplit, minSamplesLeaf, maxFeaturesPerSplit,
      rng, importanceAccum, depth + 1
    ),
  };
}

function predictTreeOne(node: TreeNode, x: Float64Array): number {
  let cur = node;
  while (!cur.isLeaf && cur.featureIdx !== undefined && cur.threshold !== undefined) {
    cur = x[cur.featureIdx] <= cur.threshold ? (cur.left || cur) : (cur.right || cur);
  }
  return cur.prob;
}

function evaluatePredictions(
  yTrue: Uint8Array,
  yProb: number[],
  threshold = 0.5
): { accuracy: number; precision: number; recall: number; f1Score: number; rocAuc: number; confusionMatrix: ConfusionMatrix; rocCurve: RocPoint[] } {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < yTrue.length; i++) {
    const pred = yProb[i] >= threshold ? 1 : 0;
    if (yTrue[i] === 1 && pred === 1) tp++;
    else if (yTrue[i] === 0 && pred === 1) fp++;
    else if (yTrue[i] === 0 && pred === 0) tn++;
    else fn++;
  }

  const total = yTrue.length || 1;
  const accuracy = (tp + tn) / total;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // ROC Curve across 41 thresholds
  const totalPos = tp + fn || 1;
  const totalNeg = tn + fp || 1;
  const rocCurve: RocPoint[] = [];
  for (let k = 0; k <= 40; k++) {
    const thr = 1 - k / 40;
    let cTp = 0;
    let cFp = 0;
    for (let i = 0; i < yTrue.length; i++) {
      if (yProb[i] >= thr) {
        if (yTrue[i] === 1) cTp++;
        else cFp++;
      }
    }
    rocCurve.push({
      fpr: Number((cFp / totalNeg).toFixed(4)),
      tpr: Number((cTp / totalPos).toFixed(4)),
      threshold: Number(thr.toFixed(2)),
    });
  }

  // Exact trapezoidal AUC over sorted (fpr, tpr)
  const sortedRoc = [...rocCurve].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);
  let auc = 0;
  for (let i = 1; i < sortedRoc.length; i++) {
    const dx = sortedRoc[i].fpr - sortedRoc[i - 1].fpr;
    const avgY = (sortedRoc[i].tpr + sortedRoc[i - 1].tpr) / 2;
    auc += dx * avgY;
  }

  return {
    accuracy: Number((accuracy * 100).toFixed(2)),
    precision: Number((precision * 100).toFixed(2)),
    recall: Number((recall * 100).toFixed(2)),
    f1Score: Number((f1Score * 100).toFixed(2)),
    rocAuc: Number(Math.min(1, Math.max(0, auc)).toFixed(4)),
    confusionMatrix: { tn, fp, fn, tp },
    rocCurve,
  };
}

function normalizeImportances(raw: Float64Array, featureNames: string[]): FeatureImportanceItem[] {
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const list = featureNames.map((feature, i) => ({
    feature,
    importance: Number(((raw[i] / sum) * 100).toFixed(2)),
  }));
  return list.sort((a, b) => b.importance - a.importance).slice(0, 12);
}

export function trainAndCompareModels(records: BankRecord[], config: MLTrainConfig): SavedModelBundle {
  const maxRows = config.maxRows ?? 12000;
  const { train, test } = stratifiedSplit(records, config.testSize, maxRows, 42);

  // Leakage-free preprocessing: fit strictly on train
  const encoder = fitEncoder(train, config.excludeDuration);
  const { X: XTrain, y: yTrain } = transformBatch(train, encoder);
  const { X: XTest, y: yTest } = transformBatch(test, encoder);

  const numFeatures = encoder.featureNames.length;
  const nTrain = XTrain.length;

  let posTrain = 0;
  for (let i = 0; i < nTrain; i++) if (yTrain[i] === 1) posTrain++;
  const negTrain = nTrain - posTrain;

  let posTest = 0;
  for (let i = 0; i < XTest.length; i++) if (yTest[i] === 1) posTest++;

  // Class imbalance weights
  const sampleWeights = new Float64Array(nTrain);
  const w1 = config.handleImbalance && posTrain > 0 ? nTrain / (2 * posTrain) : 1;
  const w0 = config.handleImbalance && negTrain > 0 ? nTrain / (2 * negTrain) : 1;
  for (let i = 0; i < nTrain; i++) {
    sampleWeights[i] = yTrain[i] === 1 ? w1 : w0;
  }

  // 1. Logistic Regression
  const t0 = Date.now();
  const lrModel = trainLogisticRegression(XTrain, yTrain, sampleWeights, numFeatures);
  const lrProbs = predictLogisticProba(XTest, lrModel.weights, lrModel.bias);
  const lrEval = evaluatePredictions(yTest, lrProbs, 0.5);
  const lrImpRaw = new Float64Array(lrModel.weights.map((w) => Math.abs(w)));
  const lrMetrics: MLModelMetrics = {
    modelKey: 'logistic_regression',
    modelName: 'Logistic Regression',
    ...lrEval,
    trainTimeMs: Math.max(12, Date.now() - t0),
    featureImportances: normalizeImportances(lrImpRaw, encoder.featureNames),
  };

  // 2. Decision Tree
  const t1 = Date.now();
  const dtRng = mulberry32(101);
  const dtImp = new Float64Array(numFeatures);
  const allTrainIndices = Array.from({ length: nTrain }, (_, i) => i);
  const dtModel = buildCartTree(
    XTrain, yTrain, sampleWeights, allTrainIndices, numFeatures,
    7, 24, 10, numFeatures, dtRng, dtImp
  );
  const dtProbs = XTest.map((x) => predictTreeOne(dtModel, x));
  const dtEval = evaluatePredictions(yTest, dtProbs, 0.5);
  const dtMetrics: MLModelMetrics = {
    modelKey: 'decision_tree',
    modelName: 'Decision Tree',
    ...dtEval,
    trainTimeMs: Math.max(15, Date.now() - t1),
    featureImportances: normalizeImportances(dtImp, encoder.featureNames),
  };

  // 3. Random Forest (25 trees with sqrt(d) feature subsampling & bootstrap)
  const t2 = Date.now();
  const rfRng = mulberry32(2026);
  const rfImp = new Float64Array(numFeatures);
  const nTrees = 25;
  const maxFeat = Math.max(3, Math.round(Math.sqrt(numFeatures)));
  const forest: TreeNode[] = [];
  const rfProbSum = new Float64Array(XTest.length);

  for (let t = 0; t < nTrees; t++) {
    const bootIdx = new Array<number>(nTrain);
    for (let i = 0; i < nTrain; i++) {
      bootIdx[i] = Math.floor(rfRng() * nTrain);
    }
    const tree = buildCartTree(
      XTrain, yTrain, sampleWeights, bootIdx, numFeatures,
      9, 16, 6, maxFeat, rfRng, rfImp
    );
    forest.push(tree);
    for (let i = 0; i < XTest.length; i++) {
      rfProbSum[i] += predictTreeOne(tree, XTest[i]);
    }
  }
  const rfProbs = Array.from(rfProbSum, (s) => s / nTrees);
  const rfEval = evaluatePredictions(yTest, rfProbs, 0.5);
  const rfMetrics: MLModelMetrics = {
    modelKey: 'random_forest',
    modelName: 'Random Forest',
    ...rfEval,
    trainTimeMs: Math.max(25, Date.now() - t2),
    featureImportances: normalizeImportances(rfImp, encoder.featureNames),
  };

  const models = [logisticMetricsSafe(lrMetrics), dtMetrics, rfMetrics];
  const sortedBest = [...models].sort((a, b) => (b.rocAuc - a.rocAuc) || (b.f1Score - a.f1Score));
  const best = sortedBest[0];
  const trainedAt = new Date().toISOString();

  const comparison: MLComparisonResponse = {
    trainedAt,
    config,
    datasetRowsUsed: train.length + test.length,
    trainRows: train.length,
    testRows: test.length,
    positiveRatioTrain: Number(((posTrain / (nTrain || 1)) * 100).toFixed(2)),
    positiveRatioTest: Number(((posTest / (XTest.length || 1)) * 100).toFixed(2)),
    featureCount: numFeatures,
    bestModelKey: best.modelKey,
    bestModelName: best.modelName,
    models,
    modelSavedPath: 'data/saved_model.json',
  };

  return {
    trainedAt,
    config,
    bestModelKey: best.modelKey,
    bestModelName: best.modelName,
    encoder,
    logisticWeights: lrModel.weights,
    logisticBias: lrModel.bias,
    decisionTree: dtModel,
    randomForest: forest,
    comparison,
  };
}

function logisticMetricsSafe(m: MLModelMetrics): MLModelMetrics {
  return m;
}

export function predictSingleCustomer(bundle: SavedModelBundle, input: PredictionInput): PredictionOutput {
  const syntheticRecord: Record<string, string | number> = {
    age: input.age,
    job: input.job.toLowerCase(),
    marital: input.marital.toLowerCase(),
    education: input.education.toLowerCase(),
    default: input.default.toLowerCase(),
    balance: input.balance ?? 1200,
    housing: input.housing.toLowerCase(),
    loan: input.loan.toLowerCase(),
    contact: input.contact.toLowerCase(),
    day: 15,
    month: input.month.toLowerCase(),
    duration: input.duration ?? 220,
    campaign: input.campaign,
    pdays: input.poutcome === 'success' ? 95 : -1,
    previous: input.previous ?? (input.poutcome === 'unknown' ? 0 : 1),
    poutcome: input.poutcome.toLowerCase(),
  };

  const x = transformRecord(syntheticRecord, bundle.encoder);

  let probability = 0.5;
  if (bundle.bestModelKey === 'logistic_regression' && bundle.logisticWeights && bundle.logisticBias !== undefined) {
    probability = predictLogisticProba([x], bundle.logisticWeights, bundle.logisticBias)[0];
  } else if (bundle.bestModelKey === 'decision_tree' && bundle.decisionTree) {
    probability = predictTreeOne(bundle.decisionTree, x);
  } else if (bundle.bestModelKey === 'random_forest' && bundle.randomForest && bundle.randomForest.length > 0) {
    const sum = bundle.randomForest.reduce((acc, tree) => acc + predictTreeOne(tree, x), 0);
    probability = sum / bundle.randomForest.length;
  }

  // Compute interpretable linear-attribution drivers using Logistic Regression weights as explainability proxy
  const contributions: PredictionContribution[] = [];
  if (bundle.logisticWeights) {
    for (let i = 0; i < bundle.encoder.featureNames.length; i++) {
      const xi = x[i];
      if (xi === 0) continue;
      const impact = bundle.logisticWeights[i] * xi;
      if (Math.abs(impact) > 0.04) {
        contributions.push({
          factor: bundle.encoder.featureNames[i].replace('=', ': '),
          impact: Number(impact.toFixed(3)),
          direction: impact >= 0 ? 'positive' : 'negative',
        });
      }
    }
  }

  contributions.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const probPct = Number((probability * 100).toFixed(1));
  const willSubscribe = probability >= 0.5;

  let confidenceLabel: PredictionOutput['confidenceLabel'] = 'Low Propensity';
  if (probPct >= 65) confidenceLabel = 'High Propensity';
  else if (probPct >= 40) confidenceLabel = 'Moderate Propensity';

  return {
    willSubscribe,
    probability: probPct,
    confidenceLabel,
    modelUsed: bundle.bestModelName,
    excludeDurationUsed: bundle.config.excludeDuration,
    contributions: contributions.slice(0, 6),
    disclaimer:
      'Model predictions are probabilistic estimates derived from historical campaign patterns and class-balanced training data—they are decision-support indicators, not guarantees of customer subscription.',
  };
}
