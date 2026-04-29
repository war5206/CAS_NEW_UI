import { useMemo, useRef } from 'react'
import { usePollingQuery } from '@/shared/hooks/usePollingQuery'
import { adaptAnalysisTrendViewModel, createDefaultAnalysisTrendViewModel } from '@/api/adapters/analysis'
import {
  queryAnalysisElectricityConsumption,
  queryAnalysisExpense,
  queryAnalysisHeatProduction,
  queryAnalysisWaterConsumption,
} from '@/api/modules/analysis'

const PAGE_CONFIGS = {
  power: {
    unit: 'kWh',
    color: '#723DFD',
    /** 用电统计「所有设备」堆叠柱：按后端系列名着色 */
    seriesColorsByKey: {
      热泵: '#FB923C',
      水泵: '#22D3EE',
      耦合能源: '#34D399',
    },
    legendName: '用电量',
    cardLabels: ['当前月总用电量（kWh）', '日均用电量（kWh）'],
    currentTotalLabel: '当前总用电量',
    summaryValueOrder: 'avg-all',
    compareNames: { mom: '上一周期用电量', yoy: '去年同期用电量' },
  },
  water: {
    unit: 't',
    color: '#1FA8FF',
    legendName: '用水量',
    cardLabels: ['当前月总用水量（t）', '日均用水量（t）'],
    currentTotalLabel: '当前总用水量',
    compareNames: { mom: '上一周期用水量', yoy: '去年同期用水量' },
  },
  heat: {
    unit: 'kWh',
    color: '#D247B1',
    legendName: '耗热量',
    cardLabels: ['当前月总耗热量（kWh）', '日均耗热量（kWh）'],
    currentTotalLabel: '当前总耗热量',
    compareNames: { mom: '上一周期耗热量', yoy: '去年同期耗热量' },
  },
  cost: {
    unit: '元',
    color: '#F0A216',
    legendName: '费用',
    cardLabels: ['当前月总费用（元）', '日均费用（元）'],
    currentTotalLabel: '当前总费用',
    compareNames: { mom: '上一周期费用', yoy: '去年同期费用' },
  },
}

const POWER_TYPE_MAP = {
  'total-power': '所有设备',
  'heat-pump': '热泵',
  'water-pump': '水泵',
  'coupling-energy': '耦合能源',
}

const COST_TYPE_MAP = {
  'total-cost': '总费用',
  'heat-pump': '热泵',
  'water-pump': '水泵',
  'coupling-energy': '耦合能源',
}

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

function getQueryFn(pageType) {
  if (pageType === 'power') return queryAnalysisElectricityConsumption
  if (pageType === 'water') return queryAnalysisWaterConsumption
  if (pageType === 'heat') return queryAnalysisHeatProduction
  return queryAnalysisExpense
}

function resolveTypeParam(pageType, titleValue) {
  if (pageType === 'power') {
    return POWER_TYPE_MAP[titleValue] || POWER_TYPE_MAP['total-power']
  }
  if (pageType === 'cost') {
    return COST_TYPE_MAP[titleValue] || COST_TYPE_MAP['total-cost']
  }
  return undefined
}

export function useAnalysisTrendQuery({ pageType, period, compareMode, range, titleValue, enabled = true } = {}) {
  const lastSuccessRef = useRef(null)
  const config = PAGE_CONFIGS[pageType]
  const payload = useMemo(() => {
    const dateRange = resolveDateRange(period, range)
    const withType = resolveTypeParam(pageType, titleValue)
    return {
      cycle: period,
      comparison: toComparison(compareMode),
      ...dateRange,
      ...(withType ? { type: withType } : {}),
    }
  }, [compareMode, pageType, period, range, titleValue])

  const query = usePollingQuery({
    queryKey: [
      'analysis',
      pageType,
      period,
      compareMode,
      payload.startDate,
      payload.endDate,
      payload.type || '',
    ],
    queryFn: () => getQueryFn(pageType)(payload),
    enabled,
    refetchInterval: false,
    select: (response) =>
      adaptAnalysisTrendViewModel(response?.data ?? response, {
        ...config,
        xAxisName: period === '日' ? '日' : period === '月' ? '月' : '年',
      }),
  })

  if (query.data) {
    lastSuccessRef.current = query.data
  }

  return {
    ...query,
    data:
      query.data ??
      lastSuccessRef.current ??
      createDefaultAnalysisTrendViewModel(config.cardLabels, config.unit),
  }
}
