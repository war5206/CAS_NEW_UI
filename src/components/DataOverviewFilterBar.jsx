import dateIcon from '../assets/icons/date.svg'
import DatePickerTrigger from './DatePickerTrigger'

const PERIOD_OPTIONS = ['日', '月', '年']

function DataOverviewFilterBar({
  period,
  onPeriodChange,
  compareMode,
  onCompareModeChange,
  range,
  onRangeChange,
}) {
  const renderDateControl = () => {
    if (period === '日') {
      return (
        <DatePickerTrigger
          type="month"
          value={range.month}
          onChange={(value) => onRangeChange({ month: value })}
          title="月份选择"
          placeholder="请选择年月"
          icon={dateIcon}
          className="data-overview-filter-bar__date"
        />
      )
    }

    if (period === '月') {
      return (
        <div className="data-overview-filter-bar__date data-overview-filter-bar__date--range">
          <DatePickerTrigger
            type="month"
            value={range.startMonth}
            onChange={(value) => onRangeChange({ startMonth: value })}
            title="开始月份选择"
            placeholder="开始月份"
            icon={dateIcon}
            className="data-overview-filter-bar__date-trigger"
          />
          <span className="data-overview-filter-bar__range-separator">至</span>
          <DatePickerTrigger
            type="month"
            value={range.endMonth}
            onChange={(value) => onRangeChange({ endMonth: value })}
            title="结束月份选择"
            placeholder="结束月份"
            icon={dateIcon}
            className="data-overview-filter-bar__date-trigger"
          />
        </div>
      )
    }

    return (
      <div className="data-overview-filter-bar__date data-overview-filter-bar__date--range">
        <DatePickerTrigger
          type="year"
          value={range.startYear}
          onChange={(value) => onRangeChange({ startYear: value })}
          title="开始年份选择"
          placeholder="开始年份"
          icon={dateIcon}
          className="data-overview-filter-bar__date-trigger"
        />
        <span className="data-overview-filter-bar__range-separator">至</span>
        <DatePickerTrigger
          type="year"
          value={range.endYear}
          onChange={(value) => onRangeChange({ endYear: value })}
          title="结束年份选择"
          placeholder="结束年份"
          icon={dateIcon}
          className="data-overview-filter-bar__date-trigger"
        />
      </div>
    )
  }

  return (
    <section className="data-overview-filter-bar" aria-label="数据筛选">
      <div className="data-overview-filter-bar__title">COP 能效分析</div>

      <div className="data-overview-filter-bar__controls">
        {renderDateControl()}

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
