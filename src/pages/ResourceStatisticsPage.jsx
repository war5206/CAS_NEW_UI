import { useState } from 'react'
import DataOverviewChart from '../components/DataOverviewChart'
import DataOverviewFilterBar from '../components/DataOverviewFilterBar'
import { syncMonthRange, addCalendarMonths, getDefaultCalendarMonthValue } from '../utils/analysisFilterUtils'
import './DataOverviewPage.css'
import './ResourceStatisticsPage.css'
import { useAnalysisTrendQuery } from '../features/analysis/hooks/useAnalysisTrendQuery'

const defaultAnalysisMonth = getDefaultCalendarMonthValue()
const currentCalendarYear = String(new Date().getFullYear())

const DEFAULT_FILTERS = {
  day: {
    month: defaultAnalysisMonth,
  },
  month: {
    startMonth: addCalendarMonths(defaultAnalysisMonth, -2),
    endMonth: defaultAnalysisMonth,
  },
  year: {
    startYear: String(Number(currentCalendarYear) - 5),
    endYear: currentCalendarYear,
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

function ResourceStatisticsPage({ pageType, titleOverride }) {
  const pageConfig =
    pageType === 'water'
      ? { title: '用水量', titleOptions: [] }
      : pageType === 'heat'
        ? { title: titleOverride || '耗热量', titleOptions: [] }
        : pageType === 'cold'
          ? { title: titleOverride || '制冷量', titleOptions: [] }
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
  const [titleValue, setTitleValue] = useState(
    pageConfig.titleOptions[0]?.value ?? titleOverride ?? '',
  )

  const activeRange = period === '日' ? filters.day : period === '月' ? filters.month : filters.year
  const queryPageType = pageType === 'cold' ? 'heat' : pageType

  const configOverrides = titleOverride
    ? {
        legendName: titleOverride,
        cardLabels: [`当前月总${titleOverride}（kWh）`, `日均${titleOverride}（kWh）`],
        currentTotalLabel: `当前总${titleOverride}`,
        compareNames: { mom: `上一周期${titleOverride}`, yoy: `去年同期${titleOverride}` },
      }
    : undefined

  const viewModelQuery = useAnalysisTrendQuery({
    pageType: queryPageType,
    period,
    compareMode,
    range: activeRange,
    titleValue,
    configOverrides,
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
