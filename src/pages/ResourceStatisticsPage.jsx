import { useMemo, useState } from 'react'
import DataOverviewChart from '../components/DataOverviewChart'
import DataOverviewFilterBar from '../components/DataOverviewFilterBar'
import './DataOverviewPage.css'
import './ResourceStatisticsPage.css'
import { buildResourceStatisticsViewModel, getResourceStatisticsPageConfig } from './resourceStatisticsData'

const DEFAULT_FILTERS = {
  day: {
    month: '2025-03',
  },
  month: {
    startMonth: '2025-01',
    endMonth: '2025-12',
  },
  year: {
    startYear: '2021',
    endYear: '2026',
  },
}

function formatFilterDateLabel(value, type, placeholder) {
  if (!value) {
    return placeholder
  }

  if (type === 'year') {
    return value
  }

  return value
}

function ResourceStatisticsPage({ pageType }) {
  const pageConfig = getResourceStatisticsPageConfig(pageType)
  const [period, setPeriod] = useState('日')
  const [compareMode, setCompareMode] = useState('none')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [titleValue, setTitleValue] = useState(pageConfig.titleOptions[0]?.value ?? '')

  const activeRange = period === '日' ? filters.day : period === '月' ? filters.month : filters.year

  const viewModel = useMemo(
    () =>
      buildResourceStatisticsViewModel({
        pageType,
        period,
        range: activeRange,
        compareMode,
      }),
    [activeRange, compareMode, pageType, period],
  )

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

  return (
    <main className="resource-statistics-page">
      <section className="resource-statistics-page__cards" aria-label={`${pageConfig.title}摘要`}>
        {viewModel.summaryCards.map((card) => (
          <article key={card.label} className="resource-statistics-page__card">
            <div className="resource-statistics-page__card-label">
              <span style={{ backgroundColor: card.color }} />
              {card.label}
            </div>
            <div className="resource-statistics-page__card-value">{card.value}</div>
          </article>
        ))}
      </section>

      <DataOverviewFilterBar
        className="resource-statistics-filter-bar"
        title={pageConfig.title}
        titleOptions={pageConfig.titleOptions}
        titleValue={titleValue}
        onTitleChange={setTitleValue}
        titleAriaLabel={`选择${pageConfig.title}`}
        period={period}
        onPeriodChange={setPeriod}
        compareMode={compareMode}
        onCompareModeChange={setCompareMode}
        range={activeRange}
        onRangeChange={handleFilterChange}
        dateDisplayFormatter={formatFilterDateLabel}
      />

      <div className="resource-statistics-page__chart-panel">
        <DataOverviewChart period={period} compareMode={compareMode} range={activeRange} chartModel={viewModel.chartModel} />
      </div>
    </main>
  )
}

export default ResourceStatisticsPage
