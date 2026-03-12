import dateIcon from '../assets/icons/date.svg'
import DatePickerTrigger from './DatePickerTrigger'
import SelectDropdown from './SelectDropdown'

const PERIOD_OPTIONS = ['日', '月', '年']

function DataOverviewFilterBar({
  period,
  onPeriodChange,
  compareMode,
  onCompareModeChange,
  range,
  onRangeChange,
  title = 'COP 能效分析',
  titleOptions = [],
  titleValue,
  onTitleChange,
  titleAriaLabel = '选择分析对象',
  className = '',
  dateDisplayFormatter,
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
          displayFormatter={dateDisplayFormatter}
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
            displayFormatter={dateDisplayFormatter}
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
            displayFormatter={dateDisplayFormatter}
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
          displayFormatter={dateDisplayFormatter}
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
          displayFormatter={dateDisplayFormatter}
        />
      </div>
    )
  }

  const rootClassName = ['data-overview-filter-bar', className].filter(Boolean).join(' ')

  return (
    <section className={rootClassName} aria-label="数据筛选">
      {titleOptions.length > 0 ? (
        <SelectDropdown
          options={titleOptions}
          value={titleValue}
          onChange={onTitleChange}
          triggerAriaLabel={titleAriaLabel}
          className="data-overview-filter-bar__title-dropdown"
          triggerClassName="data-overview-filter-bar__title-trigger"
          dropdownClassName="data-overview-filter-bar__title-menu"
          optionClassName="data-overview-filter-bar__title-option"
        />
      ) : (
        <div className="data-overview-filter-bar__title">{title}</div>
      )}

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
