import { useState } from 'react'
import DataOverviewFilterBar from '../components/DataOverviewFilterBar'
import DataOverviewChart from '../components/DataOverviewChart'
import { syncMonthRange } from '../utils/analysisFilterUtils'
import { useAnalysisTrendQuery } from '../features/analysis/hooks/useAnalysisTrendQuery'
import './DataOverviewPage.css'
import './PowerStatisticsPage.css'

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

function PowerStatisticsPage() {
  const [period, setPeriod] = useState('日')
  const [compareMode, setCompareMode] = useState('none')
  const [equipmentType, setEquipmentType] = useState('total-power')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const activeRange = period === '日' ? filters.day : period === '月' ? filters.month : filters.year
  const viewModelQuery = useAnalysisTrendQuery({
    pageType: 'power',
    period,
    compareMode,
    range: activeRange,
    titleValue: equipmentType,
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
    <main className="power-statistics-page">
      <section className="power-statistics-page__cards" aria-label="用电统计摘要">
        {viewModelQuery.data.summaryCards.map((card) => (
          <article key={card.label} className="power-statistics-page__card">
            <div className="power-statistics-page__card-label">
              <span style={{ backgroundColor: card.color }} />
              {card.label}
            </div>
            <div className="power-statistics-page__card-value">{card.value}</div>
          </article>
        ))}
      </section>

      <DataOverviewFilterBar
        className="power-statistics-filter-bar"
        titleOptions={[
          { label: '总用电', value: 'total-power' },
          { label: '热泵', value: 'heat-pump' },
          { label: '水泵', value: 'water-pump' },
          { label: '耦合能源', value: 'coupling-energy' },
        ]}
        titleValue={equipmentType}
        onTitleChange={setEquipmentType}
        titleAriaLabel="选择用电统计对象"
        period={period}
        onPeriodChange={setPeriod}
        compareMode={compareMode}
        onCompareModeChange={setCompareMode}
        range={activeRange}
        onRangeChange={handleFilterChange}
        dateDisplayFormatter={formatFilterDateLabel}
      />

      <div className="power-statistics-page__chart-panel">
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

export default PowerStatisticsPage
