import { useState } from 'react'
import DataOverviewChart from '../components/DataOverviewChart'
import DataOverviewFilterBar from '../components/DataOverviewFilterBar'
import { syncMonthRange } from '../utils/analysisFilterUtils'
import './DataOverviewPage.css'
import './ResourceStatisticsPage.css'
import { useAnalysisTrendQuery } from '../features/analysis/hooks/useAnalysisTrendQuery'

const DEFAULT_FILTERS = {
  day: {
    month: '2026-03',
  },
  month: {
    startMonth: '2026-01',
    endMonth: '2026-03',
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
  const pageConfig =
    pageType === 'water'
      ? { title: '用水量', titleOptions: [] }
      : pageType === 'heat'
        ? { title: '耗热量', titleOptions: [] }
        : pageType === 'cold'
          ? { title: '制冷量', titleOptions: [] }
          : {
              title: '总费用',
              titleOptions: [
                { label: '总费用', value: 'total-cost' },
                { label: '热泵', value: 'heat-pump' },
                { label: '水泵', value: 'water-pump' },
                { label: '耦合能源', value: 'coupling-energy' },
              ],
            }
  const [period, setPeriod] = useState('日')
  const [compareMode, setCompareMode] = useState('none')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [titleValue, setTitleValue] = useState(pageConfig.titleOptions[0]?.value ?? '')

  const activeRange = period === '日' ? filters.day : period === '月' ? filters.month : filters.year
  const queryPageType = pageType === 'cold' ? 'heat' : pageType
  const viewModelQuery = useAnalysisTrendQuery({
    pageType: queryPageType,
    period,
    compareMode,
    range: activeRange,
    titleValue,
  })

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

  return (
    <main className="resource-statistics-page">
      <section className="resource-statistics-page__cards" aria-label={`${pageConfig.title}摘要`}>
        {viewModelQuery.data.summaryCards.map((card) => (
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
        <DataOverviewChart
          period={period}
          compareMode={compareMode}
          range={activeRange}
          chartModel={viewModelQuery.data.chartModel}
        />
      </div>
    </main>
  )
}

export default ResourceStatisticsPage
