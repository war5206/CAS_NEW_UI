import { useMemo, useRef } from 'react'
import { usePollingQuery } from '@/shared/hooks/usePollingQuery'
import {
  adaptAnalysisOverviewChart,
  adaptAnalysisOverviewSummary,
  createDefaultAnalysisOverviewChart,
  createDefaultAnalysisOverviewSummary,
} from '@/api/adapters/analysis'
import { queryAnalysisOverviewCopBar, queryAnalysisOverviewSummary } from '@/api/modules/analysis'

function toComparison(compareMode) {
  if (compareMode === 'mom') return 'QOQ'
  if (compareMode === 'yoy') return 'YOY'
  return ''
}

function resolveDateRange(period, range) {
  if (period === '日') {
    return { startDate: range?.month || '', endDate: '' }
  }
  if (period === '月') {
    return { startDate: range?.startMonth || '', endDate: range?.endMonth || '' }
  }
  return { startDate: range?.startYear || '', endDate: range?.endYear || '' }
}

export function useAnalysisOverviewSummaryQuery({ enabled = true } = {}) {
  const lastSuccessRef = useRef(null)
  const query = usePollingQuery({
    queryKey: ['analysis', 'overview', 'summary'],
    queryFn: queryAnalysisOverviewSummary,
    enabled,
    refetchInterval: false,
    select: (response) => adaptAnalysisOverviewSummary(response?.data ?? response),
  })

  if (query.data) {
    lastSuccessRef.current = query.data
  }

  return {
    ...query,
    data: query.data ?? lastSuccessRef.current ?? createDefaultAnalysisOverviewSummary(),
  }
}

export function useAnalysisOverviewCopChartQuery({ period, compareMode, range, enabled = true } = {}) {
  const lastSuccessRef = useRef(null)
  const payload = useMemo(
    () => ({
      cycle: period,
      comparison: toComparison(compareMode),
      ...resolveDateRange(period, range),
      type: 'COP',
    }),
    [compareMode, period, range],
  )

  const query = usePollingQuery({
    queryKey: ['analysis', 'overview', 'cop-chart', payload.cycle, payload.comparison, payload.startDate, payload.endDate],
    queryFn: () => queryAnalysisOverviewCopBar(payload),
    enabled,
    refetchInterval: false,
    select: (response) =>
      adaptAnalysisOverviewChart(response?.data ?? response, period === '日' ? '日' : period === '月' ? '月' : '年'),
  })

  if (query.data) {
    lastSuccessRef.current = query.data
  }

  return {
    ...query,
    data: query.data ?? lastSuccessRef.current ?? createDefaultAnalysisOverviewChart(),
  }
}
