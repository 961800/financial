import AdmZip from 'adm-zip';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  buildBusinessInsights,
  buildCampaignPerformance,
  buildDashboard,
  buildDatasetSummary,
  buildEda,
  buildExploration,
  cleanDataset,
  parseBankCsv,
  recordsToCsv,
} from './server/dataProcessor.ts';
import {
  predictSingleCustomer,
  SavedModelBundle,
  trainAndCompareModels,
} from './server/mlEngine.ts';
import {
  BankRecord,
  CleaningConfig,
  DashboardFilters,
  DatasetSummary,
  MLTrainConfig,
  PredictionInput,
} from './server/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const SAVED_MODEL_PATH = path.join(DATA_DIR, 'saved_model.json');
const STREAMLIT_DIR = path.join(__dirname, 'streamlit_app');

interface AppDataState {
  datasetName: string;
  source: DatasetSummary['source'];
  targetColumn: string;
  rawRecords: Record<string, string | number>[];
  originalRecords: BankRecord[];
  activeRecords: BankRecord[];
  isCleaned: boolean;
  lastCleaningConfig?: CleaningConfig;
  summary: DatasetSummary;
  savedModel: SavedModelBundle | null;
}

function createInitialState(): AppDataState {
  const samplePath = path.join(DATA_DIR, 'bank.csv');
  if (fs.existsSync(samplePath)) {
    const csvText = fs.readFileSync(samplePath, 'utf-8');
    const parsed = parseBankCsv(csvText, 'bank.csv (UCI Official Sample)', 'uci-sample');
    const summary = buildDatasetSummary(
      parsed.normalizedRecords,
      parsed.rawRecords,
      'bank.csv (UCI Official Sample)',
      'uci-sample',
      parsed.targetColumn,
      false
    );
    const savedModel = trainAndCompareModels(parsed.normalizedRecords, {
      testSize: 0.2,
      handleImbalance: true,
      excludeDuration: true,
      maxRows: 10000,
    });
    try {
      fs.writeFileSync(SAVED_MODEL_PATH, JSON.stringify(savedModel));
    } catch {
      // Ignore write error in read-only environments
    }
    return {
      datasetName: 'bank.csv (UCI Official Sample)',
      source: 'uci-sample',
      targetColumn: parsed.targetColumn,
      rawRecords: parsed.rawRecords,
      originalRecords: parsed.normalizedRecords,
      activeRecords: parsed.normalizedRecords,
      isCleaned: false,
      summary,
      savedModel,
    };
  }

  throw new Error('Default UCI dataset data/bank.csv not found.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  let state = createInitialState();

  // Dataset status
  app.get('/api/dataset/status', (_req, res) => {
    res.json({
      summary: state.summary,
      hasSavedModel: Boolean(state.savedModel),
      bestModelName: state.savedModel?.bestModelName ?? null,
    });
  });

  // Load UCI variant or download fresh from UCI archive
  app.post('/api/dataset/load-uci', async (req, res) => {
    try {
      const variant = (req.body?.variant as string) || 'sample';
      let csvText = '';
      let datasetName = '';
      let source: DatasetSummary['source'] = 'uci-sample';

      if (variant === 'remote') {
        const resp = await fetch('https://archive.ics.uci.edu/static/public/222/bank+marketing.zip');
        if (!resp.ok) {
          throw new Error(`UCI archive returned HTTP ${resp.status}`);
        }
        const arrayBuf = await resp.arrayBuffer();
        const outerZip = new AdmZip(Buffer.from(arrayBuf));
        const bankZipEntry = outerZip.getEntry('bank.zip');
        if (!bankZipEntry) {
          throw new Error('bank.zip not found inside UCI archive.');
        }
        const innerZip = new AdmZip(bankZipEntry.getData());
        const targetFile = innerZip.getEntry('bank.csv');
        if (!targetFile) {
          throw new Error('bank.csv not found inside bank.zip.');
        }
        csvText = targetFile.getData().toString('utf-8');
        datasetName = 'bank.csv (Live UCI Download)';
        source = 'uci-downloaded';
      } else if (variant === 'full') {
        const fullPath = path.join(DATA_DIR, 'bank-full.csv');
        if (!fs.existsSync(fullPath)) {
          throw new Error('bank-full.csv not available locally.');
        }
        csvText = fs.readFileSync(fullPath, 'utf-8');
        datasetName = 'bank-full.csv (UCI Full 45,211)';
        source = 'uci-full';
      } else {
        const samplePath = path.join(DATA_DIR, 'bank.csv');
        csvText = fs.readFileSync(samplePath, 'utf-8');
        datasetName = 'bank.csv (UCI Official Sample)';
        source = 'uci-sample';
      }

      const parsed = parseBankCsv(csvText, datasetName, source);
      const summary = buildDatasetSummary(
        parsed.normalizedRecords,
        parsed.rawRecords,
        datasetName,
        source,
        parsed.targetColumn,
        false
      );

      state = {
        datasetName,
        source,
        targetColumn: parsed.targetColumn,
        rawRecords: parsed.rawRecords,
        originalRecords: parsed.normalizedRecords,
        activeRecords: parsed.normalizedRecords,
        isCleaned: false,
        summary,
        savedModel: state.savedModel,
      };

      res.json({ summary });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load UCI dataset' });
    }
  });

  // Upload custom CSV
  app.post('/api/dataset/upload', (req, res) => {
    try {
      const { csvText, fileName } = req.body as { csvText?: string; fileName?: string };
      if (!csvText || typeof csvText !== 'string') {
        res.status(400).json({ error: 'Missing CSV content.' });
        return;
      }

      const cleanName = fileName ? path.basename(fileName) : 'uploaded_campaign.csv';
      const parsed = parseBankCsv(csvText, cleanName, 'uploaded');
      const summary = buildDatasetSummary(
        parsed.normalizedRecords,
        parsed.rawRecords,
        cleanName,
        'uploaded',
        parsed.targetColumn,
        false
      );

      state = {
        datasetName: cleanName,
        source: 'uploaded',
        targetColumn: parsed.targetColumn,
        rawRecords: parsed.rawRecords,
        originalRecords: parsed.normalizedRecords,
        activeRecords: parsed.normalizedRecords,
        isCleaned: false,
        summary,
        savedModel: state.savedModel,
      };

      res.json({ summary });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid CSV format' });
    }
  });

  // Dataset exploration
  app.get('/api/analytics/exploration', (_req, res) => {
    const rawForExploration = state.isCleaned
      ? (state.activeRecords as unknown as Record<string, string | number>[])
      : state.rawRecords;
    res.json(buildExploration(state.activeRecords, rawForExploration, state.summary));
  });

  // Data cleaning
  app.post('/api/dataset/clean', (req, res) => {
    try {
      const config: CleaningConfig = {
        missingStrategy: req.body?.missingStrategy || 'mode',
        removeDuplicates: req.body?.removeDuplicates !== false,
        outlierStrategy: req.body?.outlierStrategy || 'iqr_cap',
        outlierColumns: Array.isArray(req.body?.outlierColumns)
          ? req.body.outlierColumns
          : ['age', 'balance', 'duration', 'campaign'],
        encodePreviewLimit: Number(req.body?.encodePreviewLimit) || 10,
      };

      const { cleanedRecords, result } = cleanDataset(
        state.originalRecords,
        state.datasetName,
        state.source,
        state.targetColumn,
        config
      );

      state.activeRecords = cleanedRecords;
      state.isCleaned = true;
      state.lastCleaningConfig = config;
      state.summary = result.summary;

      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Cleaning failed' });
    }
  });

  // Reset cleaning back to original parsed records
  app.post('/api/dataset/reset-clean', (_req, res) => {
    state.activeRecords = state.originalRecords;
    state.isCleaned = false;
    state.lastCleaningConfig = undefined;
    state.summary = buildDatasetSummary(
      state.originalRecords,
      state.rawRecords,
      state.datasetName,
      state.source,
      state.targetColumn,
      false
    );
    res.json({ summary: state.summary });
  });

  // Download cleaned CSV
  app.get('/api/dataset/cleaned-csv', (_req, res) => {
    const csv = recordsToCsv(state.activeRecords);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bank_marketing_cleaned.csv"');
    res.send(csv);
  });

  // EDA
  app.get('/api/analytics/eda', (_req, res) => {
    res.json(buildEda(state.activeRecords, state.summary));
  });

  // Campaign Performance
  app.get('/api/analytics/performance', (_req, res) => {
    res.json(buildCampaignPerformance(state.activeRecords));
  });

  // Interactive Dashboard
  app.post('/api/analytics/dashboard', (req, res) => {
    const filters = (req.body?.filters || {}) as Partial<DashboardFilters>;
    res.json(buildDashboard(state.activeRecords, filters));
  });

  // Business Insights
  app.get('/api/analytics/insights', (_req, res) => {
    res.json(buildBusinessInsights(state.activeRecords));
  });

  // ML Training & Comparison
  app.post('/api/ml/train', (req, res) => {
    try {
      const config: MLTrainConfig = {
        testSize: Math.min(0.4, Math.max(0.1, Number(req.body?.testSize) || 0.2)),
        handleImbalance: req.body?.handleImbalance !== false,
        excludeDuration: req.body?.excludeDuration !== false,
        maxRows: Number(req.body?.maxRows) || 12000,
      };

      const bundle = trainAndCompareModels(state.activeRecords, config);
      state.savedModel = bundle;

      try {
        fs.writeFileSync(SAVED_MODEL_PATH, JSON.stringify(bundle));
      } catch {
        // Non-fatal if filesystem is read-only
      }

      res.json(bundle.comparison);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'ML training failed' });
    }
  });

  // ML Status
  app.get('/api/ml/status', (_req, res) => {
    if (!state.savedModel) {
      res.status(404).json({ error: 'No trained model available yet.' });
      return;
    }
    res.json(state.savedModel.comparison);
  });

  // Download saved model JSON
  app.get('/api/ml/download-model', (_req, res) => {
    if (!state.savedModel) {
      res.status(404).json({ error: 'No saved model found.' });
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="best_bank_marketing_model.json"');
    res.send(JSON.stringify(state.savedModel, null, 2));
  });

  // Single Customer Prediction
  app.post('/api/ml/predict', (req, res) => {
    try {
      if (!state.savedModel) {
        res.status(400).json({ error: 'Please train a model first.' });
        return;
      }
      const input = req.body as PredictionInput;
      const output = predictSingleCustomer(state.savedModel, input);
      res.json(output);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Prediction failed' });
    }
  });

  // Export Complete Python/Streamlit Replit Project ZIP
  app.get('/api/export/streamlit-zip', (_req, res) => {
    try {
      const zip = new AdmZip();
      if (fs.existsSync(STREAMLIT_DIR)) {
        zip.addLocalFolder(STREAMLIT_DIR);
      }
      const sampleCsv = path.join(DATA_DIR, 'bank.csv');
      if (fs.existsSync(sampleCsv)) {
        zip.addLocalFile(sampleCsv, 'data');
      }
      const buf = zip.toBuffer();
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="bank_marketing_streamlit_replit.zip"');
      res.send(buf);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to package Streamlit project' });
    }
  });

  // Vite middleware in dev / static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bank Marketing Analytics server listening on http://localhost:${PORT}`);
  });
}

startServer();
