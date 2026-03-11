import dateIcon from '../assets/icons/date.svg'

const PERIOD_OPTIONS = ['日', '月', '年']

function DataOverviewFilterBar({ period, onPeriodChange, compareMode, onCompareModeChange }) {
  return (
    <section className="data-overview-filter-bar" aria-label="数据筛选">
      <div className="data-overview-filter-bar__title">COP能效分析</div>

      <div className="data-overview-filter-bar__controls">
        <button type="button" className="data-overview-filter-bar__date">
          <span>{compareMode === 'yoy' ? '2025.03-2026.03' : '2025-03'}</span>
          <img src={dateIcon} alt="" aria-hidden="true" />
        </button>

        <div className="data-overview-filter-bar__segment" role="tablist" aria-label="周期">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={period === option}
              className={`data-overview-filter-bar__segment-btn${period === option ? ' is-active' : ''}`}
              onClick={() => onPeriodChange(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`data-overview-filter-bar__toggle${compareMode === 'mom' ? ' is-active' : ''}`}
          onClick={() => onCompareModeChange(compareMode === 'mom' ? 'none' : 'mom')}
        >
          环比
        </button>

        <button
          type="button"
          className={`data-overview-filter-bar__toggle${compareMode === 'yoy' ? ' is-active' : ''}`}
          onClick={() => onCompareModeChange(compareMode === 'yoy' ? 'none' : 'yoy')}
        >
          同比
        </button>
      </div>
    </section>
  )
}

export default DataOverviewFilterBar
