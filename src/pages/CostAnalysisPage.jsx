import { useMemo, useState } from 'react'
import DataOverviewChart from '../components/DataOverviewChart'
import DataOverviewFilterBar from '../components/DataOverviewFilterBar'
import { syncMonthRange, addCalendarMonths, getDefaultCalendarMonthValue } from '../utils/analysisFilterUtils'
import { useAnalysisTrendQuery } from '../features/analysis/hooks/useAnalysisTrendQuery'
import { useAnalysisProjectContextQuery } from '../features/analysis/hooks/useAnalysisProjectContextQuery'
import './DataOverviewPage.css'
import './ResourceStatisticsPage.css'

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

function CostAnalysisPage() {
  const projectContext = useAnalysisProjectContextQuery()
  const { isHeatingCooling } = projectContext.data

  const titleOptions = useMemo(() => {
    const options = [{ label: '总费用', value: 'total-cost' }]
    if (isHeatingCooling) {
      options.push({ label: '热泵（制热）', value: 'heat-pump-heating' })
      options.push({ label: '热泵（制冷）', value: 'heat-pump-cooling' })
    } else {
      options.push({ label: '热泵（制热）', value: 'heat-pump-heating' })
    }
    options.push({ label: '水泵', value: 'water-pump' })
    options.push({ label: '耦合能源', value: 'coupling-energy' })
    return options
  }, [isHeatingCooling])

  const [period, setPeriod] = useState('日')
  const [compareMode, setCompareMode] = useState('none')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [equipmentType, setEquipmentType] = useState('total-cost')

  // 如果项目类型切换导致当前选中项不在选项列表中，则落到总费用
  const effectiveEquipmentType = useMemo(
    () => (titleOptions.some((option) => option.value === equipmentType) ? equipmentType : 'total-cost'),
    [titleOptions, equipmentType],
  )

  const activeRange = period === '日' ? filters.day : period === '月' ? filters.month : filters.year

  const viewModelQuery = useAnalysisTrendQuery({
    pageType: 'cost',
    period,
    compareMode,
    range: activeRange,
    titleValue: effectiveEquipmentType,
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
      <section className="resource-statistics-page__cards" aria-label="费用摘要">
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
        title="费用类型"
        titleOptions={titleOptions}
        titleValue={effectiveEquipmentType}
        onTitleChange={setEquipmentType}
        titleAriaLabel="选择费用类型"
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

export default CostAnalysisPage
