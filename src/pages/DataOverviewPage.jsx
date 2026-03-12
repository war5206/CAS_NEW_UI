import { useState } from 'react'
import DataOverviewFilterBar from '../components/DataOverviewFilterBar'
import DataOverviewChart from '../components/DataOverviewChart'
import upIcon from '../assets/icons/data-up.svg'
import downIcon from '../assets/icons/data-down.svg'
import './DataOverviewPage.css'

const metrics = [
  { title: 'COP', value: '2.0', color: '#FF5A36', trend: '+3.2%', trendDir: 'up' },
  { title: '总供热量（kWh）', value: '645.12', color: '#6B3DFF', trend: '+3.2%', trendDir: 'up' },
  { title: '节费比（%）', value: '10.01', color: '#F4AE21', trend: null, trendDir: null },
  {
    title: '费用（元）',
    color: '#D749C7',
    trend: '-3.2%',
    trendDir: 'down',
    totalValue: '800.01',
    averageValue: '10.01',
  },
  {
    title: '耗电量（kWh）',
    color: '#22A8FF',
    trend: '+3.2%',
    trendDir: 'up',
    totalValue: '2156',
    averageValue: '6.55',
  },
  { title: '节碳量（t）', value: '10.01', color: '#62F96D', trend: null, trendDir: null },
]

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

function renderMetricValue(metric) {
  if (metric.totalValue && metric.averageValue) {
    return (
      <>
        <span className="data-overview-page__value-label">总</span>
        {metric.totalValue}
        <span className="data-overview-page__value-gap" />
        <span className="data-overview-page__value-label">每平</span>
        {metric.averageValue}
      </>
    )
  }

  return metric.value
}

function getCardState(metric) {
  if (metric.trendDir === 'up') {
    return 'is-up'
  }

  if (metric.trendDir === 'down') {
    return 'is-down'
  }

  return 'is-neutral'
}

function DataOverviewPage() {
  const [period, setPeriod] = useState('日')
  const [compareMode, setCompareMode] = useState('none')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const handleFilterChange = (nextRange) => {
    const filterKey = period === '日' ? 'day' : period === '月' ? 'month' : 'year'

    setFilters((current) => ({
      ...current,
      [filterKey]: {
        ...current[filterKey],
        ...nextRange,
      },
    }))
  }

  const activeRange = period === '日' ? filters.day : period === '月' ? filters.month : filters.year

  return (
    <main className="data-overview-page">
      <h2 className="data-overview-page__title">本采暖季（2025.11.15 - 2026.03.15）</h2>
      <p className="data-overview-page__tip">热表精度影响 COP，COP 仅作参考；节碳量以供热数据为准</p>

      <section className="data-overview-page__cards">
        {metrics.map((metric) => (
          <article key={metric.title} className={`data-overview-page__card ${getCardState(metric)}`}>
            <div className="data-overview-page__card-head">
              <div className="data-overview-page__card-label">
                <span style={{ backgroundColor: metric.color }} />
                {metric.title}
              </div>
              {metric.trend ? (
                <div className={`data-overview-page__trend is-${metric.trendDir}`}>
                  <img src={metric.trendDir === 'up' ? upIcon : downIcon} alt="" aria-hidden="true" />
                  {metric.trend}
                </div>
              ) : (
                <span className="data-overview-page__trend-placeholder">--</span>
              )}
            </div>
            <div className="data-overview-page__card-value">{renderMetricValue(metric)}</div>
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

      <DataOverviewChart period={period} compareMode={compareMode} range={activeRange} />
    </main>
  )
}

export default DataOverviewPage
