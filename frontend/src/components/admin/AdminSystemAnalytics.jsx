import { useState, useEffect } from 'react'
import { getAdminAnalyticsAccuracy, trainAdminAnalyticsModel } from '../../api'
import { useAuth } from '../../context/AuthContext'

const PROFILE_META = {
  early_warning: {
    label: 'Early Warning',
    description: 'Uses pre-grade risk signals only: prior GPA, failed subjects, attendance, and needs assessment factors.',
  },
  midterm_endterm: {
    label: 'Midterm/End-Term',
    description: 'Includes grade components like class standing, laboratory, major output, and midterm/final term grades.',
  },
  midterm_attendance_needs: {
    label: 'Midterm, Attendance, and Needs Assessment',
    description: 'Uses the saved retrained pipeline based on midterm grade, attendance, and needs assessment factors.',
  },
}

const MODEL_META = {
  xgboost: { label: 'XGBoost', color: 'text-cyan-600' },
  xgboost_tuned: { label: 'XGBoost Tuned', color: 'text-sky-600' },
  random_forest: { label: 'Random Forest', color: 'text-emerald-600' },
  extra_trees: { label: 'Extra Trees', color: 'text-teal-600' },
  ensemble: { label: 'Ensemble', color: 'text-violet-600' },
}

function formatModelLabel(modelKey) {
  return MODEL_META[modelKey]?.label || String(modelKey || 'Unknown model').replace(/_/g, ' ')
}

export default function AdminSystemAnalytics() {
  const { role } = useAuth()
  const [accuracyData, setAccuracyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [training, setTraining] = useState(false)
  const [trainingMessage, setTrainingMessage] = useState('')

  useEffect(() => {
    let isMounted = true
    async function loadAccuracy() {
      setLoading(true)
      try {
        const acc = await getAdminAnalyticsAccuracy()
        if (isMounted) {
          setAccuracyData(Array.isArray(acc) ? acc : [])
          setError(null)
        }
      } catch (e) {
        if (isMounted) {
          setError(e?.message || 'Failed to load analytics')
          setAccuracyData([])
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (role !== 'admin') {
      setAccuracyData([])
      setLoading(false)
      setError(null)
      return () => {
        isMounted = false
      }
    }
    loadAccuracy()
    return () => {
      isMounted = false
    }
  }, [role])

  async function handleTrainModel() {
    setTraining(true)
    setTrainingMessage('')
    setError(null)
    try {
      const result = await trainAdminAnalyticsModel()
      const acc = await getAdminAnalyticsAccuracy()
      setAccuracyData(Array.isArray(acc) ? acc : [])
      setTrainingMessage(
        `Training finished. ${result.selected_model || result.best_model || 'Model'} saved using ${result.training_rows || 0} rows.`
      )
    } catch (e) {
      setError(e?.message || 'Failed to train model')
    } finally {
      setTraining(false)
    }
  }

  const latestAccuracy = accuracyData.length > 0 ? accuracyData[accuracyData.length - 1] : null
  const latestModels = latestAccuracy?.allModels || {}
  const activeProfile = PROFILE_META[latestAccuracy?.profile] || {
    label: latestAccuracy?.profile || 'Model Metrics',
    description: 'Saved training metrics will appear here once the AI pipeline writes them.',
  }
  const activeModelKey = latestAccuracy?.modelName || latestAccuracy?.bestModel || null
  const activeModelLabel = formatModelLabel(activeModelKey)
  const comparisonCards = Object.keys(latestModels).map((key) => ({
    key,
    label: formatModelLabel(key),
    color: MODEL_META[key]?.color || 'text-slate-700',
  }))

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading analytics...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {trainingMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
          {trainingMessage}
        </div>
      )}

      <div className="rounded-2xl border border-cyan-200/80 bg-gradient-to-r from-cyan-50 via-sky-50 to-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Model Analytics</p>
            <h3 className="text-lg font-semibold text-slate-900">Current production model performance</h3>
            <p className="text-sm text-slate-600">
              {latestAccuracy ? (
                <>
                  The active profile is <span className="font-semibold text-slate-800">{activeProfile.label}</span>, and the current saved runtime model is <span className="font-semibold text-slate-800">{activeModelLabel}</span>.
                </>
              ) : (
                'No saved training metrics yet. Use the button to run a real training pass before your demo.'
              )}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row lg:flex-col lg:items-end">
            <button
              type="button"
              onClick={handleTrainModel}
              disabled={training}
              className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
            >
              {training ? 'Training Model...' : 'Train Model'}
            </button>
          </div>
        </div>

        {latestAccuracy ? (
          <>
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-xl border border-cyan-100 bg-white/85 p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Holdout</p>
              <p className="mt-1 text-lg font-bold text-cyan-600">
                {latestAccuracy.accuracy.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-white/85 p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Precision</p>
              <p className="mt-1 text-lg font-bold text-emerald-600">
                {latestAccuracy.precision.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-white/85 p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Recall</p>
              <p className="mt-1 text-lg font-bold text-blue-600">
                {latestAccuracy.recall.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-white/85 p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">F1 Score</p>
              <p className="mt-1 text-lg font-bold text-violet-600">
                {latestAccuracy.f1.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Cross-validation mean</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {latestAccuracy.cvAccuracy.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Training date</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {latestAccuracy.month || 'Latest'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Best model selected</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatModelLabel(latestAccuracy.bestModel)}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5">
            <p className="text-xs text-slate-600">
              {activeProfile.description}
            </p>
          </div>
          </>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-cyan-200 bg-white/75 px-4 py-4 text-sm text-slate-600">
            Training metrics and model comparison will appear here after the first successful run.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Saved Model Comparison</h2>
          <p className="mt-1 text-xs text-slate-500">
            Direct comparison of all models evaluated in the latest saved training run.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {comparisonCards.length > 0 ? comparisonCards.map((model) => {
            const metrics = latestModels[model.key]
            return (
              <div key={model.key} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">{model.label}</p>
                <p className={`mt-1 text-base font-bold ${model.color}`}>
                  {metrics ? `${(metrics.holdout_accuracy * 100).toFixed(2)}%` : 'No data'}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {metrics ? `CV ${(metrics.cv_mean_accuracy * 100).toFixed(2)}%` : 'Waiting for saved metrics'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics ? `F1 ${(metrics.f1_weighted * 100).toFixed(2)}%` : ''}
                </p>
              </div>
            )
          }) : (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-sm text-slate-500">
              No saved comparison metrics yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
