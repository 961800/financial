/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CleaningView } from './components/views/CleaningView';
import { DashboardView } from './components/views/DashboardView';
import { EdaView } from './components/views/EdaView';
import { ExplorationView } from './components/views/ExplorationView';
import { HomeView } from './components/views/HomeView';
import { InsightsView } from './components/views/InsightsView';
import { MlComparisonView } from './components/views/MlComparisonView';
import { PerformanceView } from './components/views/PerformanceView';
import { PredictionView } from './components/views/PredictionView';
import { ReportView } from './components/views/ReportView';
import {
  BusinessInsightsResponse,
  CampaignPerformanceResponse,
  CleaningConfig,
  CleaningResult,
  DashboardFilters,
  DashboardResponse,
  DatasetSummary,
  EdaResponse,
  ExplorationResponse,
  MLComparisonResponse,
  MLTrainConfig,
  ModuleKey,
  PredictionInput,
  PredictionOutput,
} from './types/analytics';

const EMPTY_FILTERS: DashboardFilters = {
  months: [],
  jobs: [],
  marital: [],
  education: [],
  contact: [],
  housing: [],
};

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [bestModelName, setBestModelName] = useState<string | null>(null);

  const [exploration, setExploration] = useState<ExplorationResponse | null>(null);
  const [cleaningResult, setCleaningResult] = useState<CleaningResult | null>(null);
  const [eda, setEda] = useState<EdaResponse | null>(null);
  const [performance, setPerformance] = useState<CampaignPerformanceResponse | null>(null);
  const [mlComparison, setMlComparison] = useState<MLComparisonResponse | null>(null);
  const [prediction, setPrediction] = useState<PredictionOutput | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [insights, setInsights] = useState<BusinessInsightsResponse | null>(null);

  const [loadingDataset, setLoadingDataset] = useState(false);
  const [loadingModule, setLoadingModule] = useState(false);
  const [cleaningBusy, setCleaningBusy] = useState(false);
  const [trainingBusy, setTrainingBusy] = useState(false);
  const [predictingBusy, setPredictingBusy] = useState(false);

  const apiFetch = async <T,>(url: string, options?: RequestInit): Promise<T> => {
    const resp = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const body = await resp.json();
    if (!resp.ok) {
      throw new Error(body.error || `Request failed (${resp.status})`);
    }
    return body as T;
  };

  const refreshInitialStatus = useCallback(async () => {
    try {
      const status = await apiFetch<{
        summary: DatasetSummary;
        hasSavedModel: boolean;
        bestModelName: string | null;
      }>('/api/dataset/status');
      setSummary(status.summary);
      setBestModelName(status.bestModelName);
      if (status.hasSavedModel) {
        const ml = await apiFetch<MLComparisonResponse>('/api/ml/status');
        setMlComparison(ml);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to connect to analytics server');
    }
  }, []);

  useEffect(() => {
    refreshInitialStatus();
  }, [refreshInitialStatus]);

  const invalidateAnalyticsCaches = () => {
    setExploration(null);
    setEda(null);
    setPerformance(null);
    setDashboard(null);
    setInsights(null);
  };

  // Load module data on demand
  useEffect(() => {
    let cancelled = false;

    const loadCurrentModule = async () => {
      setErrorMsg(null);
      try {
        if (activeModule === 'exploration' && !exploration) {
          setLoadingModule(true);
          const data = await apiFetch<ExplorationResponse>('/api/analytics/exploration');
          if (!cancelled) setExploration(data);
        } else if (activeModule === 'eda' && !eda) {
          setLoadingModule(true);
          const data = await apiFetch<EdaResponse>('/api/analytics/eda');
          if (!cancelled) setEda(data);
        } else if (activeModule === 'performance' && !performance) {
          setLoadingModule(true);
          const data = await apiFetch<CampaignPerformanceResponse>('/api/analytics/performance');
          if (!cancelled) setPerformance(data);
        } else if (activeModule === 'dashboard') {
          setLoadingModule(true);
          const data = await apiFetch<DashboardResponse>('/api/analytics/dashboard', {
            method: 'POST',
            body: JSON.stringify({ filters: dashboardFilters }),
          });
          if (!cancelled) setDashboard(data);
        } else if (activeModule === 'insights' && !insights) {
          setLoadingModule(true);
          const data = await apiFetch<BusinessInsightsResponse>('/api/analytics/insights');
          if (!cancelled) setInsights(data);
        } else if (activeModule === 'report') {
          if (!performance || !insights) {
            setLoadingModule(true);
            const [perfRes, insRes] = await Promise.all([
              performance ? Promise.resolve(performance) : apiFetch<CampaignPerformanceResponse>('/api/analytics/performance'),
              insights ? Promise.resolve(insights) : apiFetch<BusinessInsightsResponse>('/api/analytics/insights'),
            ]);
            if (!cancelled) {
              setPerformance(perfRes);
              setInsights(insRes);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load module data');
        }
      } finally {
        if (!cancelled) setLoadingModule(false);
      }
    };

    loadCurrentModule();
    return () => {
      cancelled = true;
    };
  }, [activeModule, exploration, eda, performance, insights, dashboardFilters]);

  const handleLoadUci = async (variant: 'sample' | 'full' | 'remote') => {
    setErrorMsg(null);
    setNoticeMsg(null);
    setLoadingDataset(true);
    try {
      const res = await apiFetch<{ summary: DatasetSummary }>('/api/dataset/load-uci', {
        method: 'POST',
        body: JSON.stringify({ variant }),
      });
      setSummary(res.summary);
      setCleaningResult(null);
      setDashboardFilters(EMPTY_FILTERS);
      invalidateAnalyticsCaches();
      setNoticeMsg(`Loaded ${res.summary.datasetName} (${res.summary.rowCount.toLocaleString()} records).`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load UCI dataset');
    } finally {
      setLoadingDataset(false);
    }
  };

  const handleUploadCsvFile = async (file: File) => {
    setErrorMsg(null);
    setNoticeMsg(null);
    setLoadingDataset(true);
    try {
      const csvText = await file.text();
      const res = await apiFetch<{ summary: DatasetSummary }>('/api/dataset/upload', {
        method: 'POST',
        body: JSON.stringify({ csvText, fileName: file.name }),
      });
      setSummary(res.summary);
      setCleaningResult(null);
      setDashboardFilters(EMPTY_FILTERS);
      invalidateAnalyticsCaches();
      setNoticeMsg(
        `Uploaded ${res.summary.datasetName} (${res.summary.rowCount.toLocaleString()} records, auto-detected target "${res.summary.targetColumn}").`
      );
      if (activeModule === 'home') {
        setActiveModule('exploration');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to parse CSV file');
    } finally {
      setLoadingDataset(false);
    }
  };

  const handleApplyCleaning = async (config: CleaningConfig) => {
    setErrorMsg(null);
    setNoticeMsg(null);
    setCleaningBusy(true);
    try {
      const res = await apiFetch<CleaningResult>('/api/dataset/clean', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      setCleaningResult(res);
      setSummary(res.summary);
      invalidateAnalyticsCaches();
      setNoticeMsg(`Data cleaning applied: ${res.beforeRows.toLocaleString()} → ${res.afterRows.toLocaleString()} rows.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Data cleaning failed');
    } finally {
      setCleaningBusy(false);
    }
  };

  const handleResetCleaning = async () => {
    setErrorMsg(null);
    setNoticeMsg(null);
    setCleaningBusy(true);
    try {
      const res = await apiFetch<{ summary: DatasetSummary }>('/api/dataset/reset-clean', {
        method: 'POST',
      });
      setSummary(res.summary);
      setCleaningResult(null);
      invalidateAnalyticsCaches();
      setNoticeMsg('Restored raw dataset state.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reset dataset');
    } finally {
      setCleaningBusy(false);
    }
  };

  const handleTrainModels = async (config: MLTrainConfig) => {
    setErrorMsg(null);
    setNoticeMsg(null);
    setTrainingBusy(true);
    try {
      const res = await apiFetch<MLComparisonResponse>('/api/ml/train', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      setMlComparison(res);
      setBestModelName(res.bestModelName);
      setNoticeMsg(`Trained 3 models. Best model saved: ${res.bestModelName} (ROC-AUC ${res.models.find((m) => m.modelKey === res.bestModelKey)?.rocAuc.toFixed(4)}).`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Model training failed');
    } finally {
      setTrainingBusy(false);
    }
  };

  const handlePredict = async (input: PredictionInput) => {
    setErrorMsg(null);
    setPredictingBusy(true);
    try {
      const res = await apiFetch<PredictionOutput>('/api/ml/predict', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setPrediction(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setPredictingBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        summary={summary}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeModule={activeModule}
          summary={summary}
          onOpenMobile={() => setMobileMenuOpen(true)}
          onUploadCsvFile={handleUploadCsvFile}
          uploading={loadingDataset}
        />

        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto space-y-5">
          {errorMsg && (
            <div className="no-print bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-md text-xs flex items-center justify-between gap-4">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="font-medium underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {noticeMsg && (
            <div className="no-print bg-sky-50 border border-sky-200 text-sky-900 px-4 py-3 rounded-md text-xs flex items-center justify-between gap-4">
              <span>{noticeMsg}</span>
              <button
                type="button"
                onClick={() => setNoticeMsg(null)}
                className="font-medium underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeModule === 'home' && (
            <HomeView
              summary={summary}
              loadingDataset={loadingDataset}
              onLoadUci={handleLoadUci}
              onUploadCsvFile={handleUploadCsvFile}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'exploration' && (
            <ExplorationView
              data={exploration}
              loading={loadingModule}
              onUploadCsvFile={handleUploadCsvFile}
            />
          )}

          {activeModule === 'cleaning' && (
            <CleaningView
              summary={summary}
              cleaningResult={cleaningResult}
              applying={cleaningBusy}
              onApplyCleaning={handleApplyCleaning}
              onResetCleaning={handleResetCleaning}
            />
          )}

          {activeModule === 'eda' && <EdaView data={eda} loading={loadingModule} />}

          {activeModule === 'performance' && (
            <PerformanceView data={performance} loading={loadingModule} />
          )}

          {activeModule === 'ml' && (
            <MlComparisonView
              data={mlComparison}
              training={trainingBusy}
              onTrainModels={handleTrainModels}
            />
          )}

          {activeModule === 'prediction' && (
            <PredictionView
              bestModelName={bestModelName}
              predicting={predictingBusy}
              prediction={prediction}
              onPredict={handlePredict}
            />
          )}

          {activeModule === 'dashboard' && (
            <DashboardView
              data={dashboard}
              filters={dashboardFilters}
              loading={loadingModule}
              onChangeFilters={setDashboardFilters}
            />
          )}

          {activeModule === 'insights' && (
            <InsightsView data={insights} loading={loadingModule} />
          )}

          {activeModule === 'report' && (
            <ReportView
              summary={summary}
              performance={performance}
              ml={mlComparison}
              insights={insights}
            />
          )}
        </main>
      </div>
    </div>
  );
}
