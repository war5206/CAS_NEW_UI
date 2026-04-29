import { useState } from 'react'
import DataOverviewFilterBar from '../components/DataOverviewFilterBar'
import DataOverviewChart from '../components/DataOverviewChart'
import upIcon from '../assets/icons/data-up.svg'
import downIcon from '../assets/icons/data-down.svg'
import { syncMonthRange } from '../utils/analysisFilterUtils'
import {
  useAnalysisOverviewCopChartQuery,
  useAnalysisOverviewSummaryQuery,
} from '../features/analysis/hooks/useAnalysisOverviewQueries'
import './DataOverviewPage.css'

const DEFAULT_FILTERS = {
  day: {
    month: '2026-03',
  },
  month: {
    startMonth: '2025-11',
    endMonth: '2026-03',
  },
  year: {
    startYear: '2024',
    endYear: '2026',
  },
}

/** 同比区域是否为数值意义上的 0（含 0、0.0、0.00、0.00% 等）——此类情况不展示升降箭头 */
function isZeroYoYTrend(trend) {
  if (trend == null || trend === '') {
    return false
  }
  const normalized = String(trend).trim().replace(/%/g, '')
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) && n === 0
}

function getTrendIconSideClass(trend) {
  if (isZeroYoYTrend(trend)) {
    return 'is-neutral'
  }
  if (trend.startsWith('-')) {
    return 'is-down'
  }
  return 'is-up'
}

function getCardState(metric) {
  if (isZeroYoYTrend(metric.trend)) {
    return 'is-neutral'
  }

  if (metric.trend?.startsWith('+')) {
    return 'is-up'
  }

  if (metric.trend?.startsWith('-')) {
    return 'is-down'
  }

  return 'is-neutral'
}

function DataOverviewPage() {
  const [period, setPeriod] = useState('日')
  const [compareMode, setCompareMode] = useState('none')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const summaryQuery = useAnalysisOverviewSummaryQuery()

  const handleFilterChange = (nextRange) => {
    const filterKey = period === '日' ? 'day' : period === '月' ? 'month' : 'year'

    setFilters((current) => {
      const mergedRange = {
        ...current[filterKey],
        ...nextRange,
      }

      return {
        ...current,
        [filterKey]: filterKey === 'month' ? syncMonthRange(mergedRange, Object.keys(nextRange)[0]) : mergedRange,
      }
    })
  }

  const activeRange = period === '日' ? filters.day : period === '月' ? filters.month : filters.year
  const chartQuery = useAnalysisOverviewCopChartQuery({
    period,
    compareMode,
    range: activeRange,
  })

  return (
    <main className="data-overview-page">
      <h2 className="data-overview-page__title">{summaryQuery.data.seasonLabel}</h2>
      <p className="data-overview-page__tip">热表精度影响 COP，COP 仅作参考；节碳量以供热数据为准</p>

      <section className="data-overview-page__cards">
        {summaryQuery.data.metrics.map((metric) => (
          <article key={metric.title} className={`data-overview-page__card ${getCardState(metric)}`}>
            <div className="data-overview-page__card-head">
              <div className="data-overview-page__card-label">
                <span style={{ backgroundColor: metric.color }} />
                {metric.title}
              </div>
              {metric.trend ? (
                <div className={`data-overview-page__trend ${getTrendIconSideClass(metric.trend)}`}>
                  {!isZeroYoYTrend(metric.trend) ? (
                    <img src={metric.trend.startsWith('-') ? downIcon : upIcon} alt="" aria-hidden="true" />
                  ) : null}
                  {metric.trend}
                </div>
              ) : (
                <span className="data-overview-page__trend-placeholder">--</span>
              )}
            </div>
            <div className="data-overview-page__card-value">{metric.value}</div>
          </article>
        ))}
      </section>

      <DataOverviewFilterBar
        period={period}
        onPeriodChange={setPeriod}
        compareMode={compareMode}
        onCompareModeChange={setCompareMode}
        range={activeRange}
        onRangeChange={handleFilterChange}
      />

      <DataOverviewChart period={period} compareMode={compareMode} range={activeRange} chartModel={chartQuery.data} />
    </main>
  )
}

export default DataOverviewPage
