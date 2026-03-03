import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import SelectDropdown from '../components/SelectDropdown'
import TimePickerModal from '../components/TimePickerModal'
import ToggleSwitch from '../components/ToggleSwitch'
import intelligentTimeSettingIcon from '../assets/intelligent-time-setting.svg'
import day24Icon from '../assets/24hour.svg'
import editIcon from '../assets/edit.svg'
import circlePlusBlackIcon from '../assets/circle_plus_black.svg'
import circlePlusBlueIcon from '../assets/circle_plus_blue.svg'
import circlePlusWhiteIcon from '../assets/circle_plus_white.svg'
import circleReduceBlackIcon from '../assets/circle_reduce_black.svg'
import closeIcon from '../assets/icons/close.svg'
import './SmartTimerPage.css'

const TOTAL_DAY_MINUTES = 24 * 60
const MAX_CYCLE_COUNT = 8
const MAX_PERIOD_COUNT = 6

const WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
]

const PERIOD_MODE_OPTIONS = [
  { value: 'climate', label: '气候补偿智能调节' },
  { value: 'constant', label: '定温模式' },
]

const TIME_HOURS = Array.from({ length: 25 }, (_, index) => index)
const TIME_MINUTES = Array.from({ length: 60 }, (_, index) => index)

const DAY_ORDER_MAP = new Map(WEEKDAY_OPTIONS.map((item, index) => [item.value, index]))
const DAY_LABEL_MAP = new Map(WEEKDAY_OPTIONS.map((item) => [item.value, item.label]))

const INITIAL_PLANS = [
  {
    name: '方案一',
    enabled: true,
    cycles: [
      {
        days: [1, 2, 3, 4],
        periods: [
          { start: '00:00', end: '06:00', mode: 'climate' },
          { start: '06:00', end: '15:00', mode: 'constant', temperature: '35' },
          { start: '15:00', end: '24:00', mode: 'climate' },
        ],
      },
      {
        days: [5, 6, 0],
        periods: [],
      },
    ],
  },
  {
    name: '方案二',
    enabled: false,
    cycles: [
      {
        days: [1, 2, 3, 4, 5, 6, 0],
        periods: [],
      },
    ],
  },
]

let entityIdSeed = 1000

function createEntityId() {
  entityIdSeed += 1
  return entityIdSeed
}

function formatTwoDigits(value) {
  return String(value).padStart(2, '0')
}

function sanitizePlanName(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed || '方案'
}

function sanitizeTemperature(value) {
  const onlyDigits = String(value ?? '').replace(/[^\d]/g, '')
  if (!onlyDigits) {
    return ''
  }

  const parsed = Number.parseInt(onlyDigits, 10)
  if (!Number.isFinite(parsed)) {
    return ''
  }

  const safeValue = Math.min(50, Math.max(0, parsed))
  return String(safeValue)
}

function parseTimeValue(value) {
  const matched = String(value ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{1,2})$/)

  if (!matched) {
    return [0, 0]
  }

  const parsedHour = Number.parseInt(matched[1], 10)
  const parsedMinute = Number.parseInt(matched[2], 10)
  const safeHour = Number.isFinite(parsedHour) ? Math.min(Math.max(parsedHour, 0), 24) : 0
  const safeMinuteValue = Number.isFinite(parsedMinute) ? Math.min(Math.max(parsedMinute, 0), 59) : 0
  const safeMinute = safeHour === 24 ? 0 : safeMinuteValue

  return [safeHour, safeMinute]
}

function normalizeTimeValue(value) {
  const [hours, minutes] = parseTimeValue(value)
  return `${formatTwoDigits(hours)}:${formatTwoDigits(minutes)}`
}

function parseTimeToMinutes(value) {
  const [hours, minutes] = parseTimeValue(value)
  return Math.min(TOTAL_DAY_MINUTES, hours * 60 + minutes)
}

function formatTimelineTick(minutes) {
  const safeMinutes = Math.min(TOTAL_DAY_MINUTES, Math.max(0, minutes))
  const hours = Math.floor(safeMinutes / 60)
  const restMinutes = safeMinutes % 60
  return `${hours}:${formatTwoDigits(restMinutes)}`
}

function sortDays(days) {
  return [...new Set(days.filter((day) => DAY_ORDER_MAP.has(day)))].sort(
    (left, right) => DAY_ORDER_MAP.get(left) - DAY_ORDER_MAP.get(right),
  )
}

function resolveCycleDayText(days) {
  const labels = sortDays(days).map((day) => DAY_LABEL_MAP.get(day))
  return labels.length > 0 ? labels.join(' ') : '未设置周期'
}

function resolvePeriodLabel(period) {
  if (period.mode === 'constant') {
    return period.temperature ? `定温模式${period.temperature}℃` : '定温模式'
  }

  return '气候补偿智能调节'
}

function createPeriod(initial = {}) {
  const mode = initial.mode === 'constant' ? 'constant' : 'climate'
  return {
    id: Number.isFinite(initial.id) ? initial.id : createEntityId(),
    start: normalizeTimeValue(initial.start ?? '00:00'),
    end: normalizeTimeValue(initial.end ?? '00:00'),
    mode,
    temperature: mode === 'constant' ? sanitizeTemperature(initial.temperature) : '',
  }
}

function createCycle(initial = {}) {
  const sourcePeriods = Array.isArray(initial.periods) ? initial.periods : [{}]
  return {
    id: Number.isFinite(initial.id) ? initial.id : createEntityId(),
    days: sortDays(Array.isArray(initial.days) ? initial.days : []),
    periods: sourcePeriods.map((period) => createPeriod(period)),
  }
}

function createPlan(initial = {}) {
  const sourceCycles = Array.isArray(initial.cycles) && initial.cycles.length > 0 ? initial.cycles : [{}]
  return {
    id: Number.isFinite(initial.id) ? initial.id : createEntityId(),
    name: sanitizePlanName(initial.name),
    enabled: initial.enabled !== false,
    cycles: sourceCycles.map((cycle) => createCycle(cycle)),
  }
}

function clonePlan(plan) {
  return {
    ...plan,
    cycles: plan.cycles.map((cycle) => ({
      ...cycle,
      days: [...cycle.days],
      periods: cycle.periods.map((period) => ({ ...period })),
    })),
  }
}

function resolveValidPeriods(periods) {
  return periods
    .map((period) => ({
      ...period,
      startMinutes: parseTimeToMinutes(period.start),
      endMinutes: parseTimeToMinutes(period.end),
    }))
    .filter((period) => period.endMinutes > period.startMinutes)
    .sort((left, right) => left.startMinutes - right.startMinutes)
}

function buildTimelineSegments(periods) {
  const validPeriods = resolveValidPeriods(periods)
  if (validPeriods.length <= 0) {
    return [
      {
        key: 'empty-all',
        type: 'empty',
        duration: TOTAL_DAY_MINUTES,
        label: '暂无设置',
      },
    ]
  }

  const segments = []
  let cursor = 0

  validPeriods.forEach((period, index) => {
    const start = Math.max(0, Math.min(TOTAL_DAY_MINUTES, period.startMinutes))
    const end = Math.max(0, Math.min(TOTAL_DAY_MINUTES, period.endMinutes))
    if (end <= cursor) {
      return
    }

    if (start > cursor) {
      segments.push({
        key: `gap-${index}-${cursor}`,
        type: 'empty',
        duration: start - cursor,
        label: '',
      })
    }

    const effectiveStart = Math.max(cursor, start)
    if (end > effectiveStart) {
      segments.push({
        key: `period-${period.id}`,
        type: period.mode,
        duration: end - effectiveStart,
        label: resolvePeriodLabel(period),
      })
      cursor = end
    }
  })

  if (cursor < TOTAL_DAY_MINUTES) {
    segments.push({
      key: `tail-${cursor}`,
      type: 'empty',
      duration: TOTAL_DAY_MINUTES - cursor,
      label: '',
    })
  }

  return segments
}

function buildTimelineTicks(periods) {
  const validPeriods = resolveValidPeriods(periods)
  if (validPeriods.length <= 0) {
    return [0, TOTAL_DAY_MINUTES]
  }

  const points = new Set([0, TOTAL_DAY_MINUTES])
  validPeriods.forEach((period) => {
    points.add(period.startMinutes)
    points.add(period.endMinutes)
  })

  return [...points].sort((left, right) => left - right)
}

function resolveNextPlanName(plans) {
  const usedIndexes = new Set(
    plans
      .map((plan) => {
        const matched = plan.name.match(/^方案(\d+)$/)
        return matched ? Number.parseInt(matched[1], 10) : null
      })
      .filter((value) => Number.isFinite(value)),
  )

  let index = 1
  while (usedIndexes.has(index)) {
    index += 1
  }
  return `方案${index}`
}

function SmartTimerPlanCard({ plan, onEdit, onToggle }) {
  return (
    <article className="smart-timer-page__plan-card">
      <header className="smart-timer-page__plan-head">
        <div className="smart-timer-page__plan-title-wrap">
          <h3 className="smart-timer-page__plan-title">{plan.name}</h3>
          <button type="button" className="smart-timer-page__plan-edit-btn" aria-label={`编辑${plan.name}`} onClick={onEdit}>
            <img src={editIcon} alt="" aria-hidden="true" />
          </button>
        </div>

        <ToggleSwitch
          checked={plan.enabled}
          onToggle={onToggle}
          className="smart-timer-page__plan-switch"
          ariaLabel={`${plan.name}${plan.enabled ? '关闭' : '开启'}`}
        />
      </header>

      {plan.enabled ? (
        <div className="smart-timer-page__plan-body">
          {plan.cycles.map((cycle) => {
            const segments = buildTimelineSegments(cycle.periods)
            const ticks = buildTimelineTicks(cycle.periods)
            const isEmptyCycle = resolveValidPeriods(cycle.periods).length <= 0
            return (
              <section key={cycle.id} className="smart-timer-page__cycle-block">
                <div className={`smart-timer-page__cycle-days${isEmptyCycle ? ' is-chip' : ''}`}>{resolveCycleDayText(cycle.days)}</div>

                <div className="smart-timer-page__timeline-ticks">
                  {ticks.map((tickMinutes) => {
                    const position = (tickMinutes / TOTAL_DAY_MINUTES) * 100
                    const tickClassName = [
                      'smart-timer-page__timeline-tick',
                      tickMinutes === 0 ? 'is-start' : '',
                      tickMinutes === TOTAL_DAY_MINUTES ? 'is-end' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <span key={`${cycle.id}-${tickMinutes}`} className={tickClassName} style={{ left: `${position}%` }}>
                        {formatTimelineTick(tickMinutes)}
                      </span>
                    )
                  })}
                </div>

                <div className={`smart-timer-page__timeline-track${isEmptyCycle ? ' is-empty' : ''}`}>
                  {segments.map((segment) => {
                    const segmentClassName = [
                      'smart-timer-page__timeline-segment',
                      `is-${segment.type}`,
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <div
                        key={`${cycle.id}-${segment.key}`}
                        className={segmentClassName}
                        style={{ flexGrow: segment.duration, flexBasis: 0 }}
                      >
                        {segment.label ? <span>{segment.label}</span> : null}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      ) : null}
    </article>
  )
}

function SmartTimerPage() {
  const [pageMode, setPageMode] = useState('smart')
  const [plans, setPlans] = useState(() => INITIAL_PLANS.map((plan) => createPlan(plan)))
  const [editorState, setEditorState] = useState({
    isOpen: false,
    type: 'create',
    planId: null,
    draftPlan: null,
  })
  const [timePickerTarget, setTimePickerTarget] = useState(null)
  const draftPlan = editorState.draftPlan
  const isEditing = editorState.type === 'edit'

  const closeEditor = () => {
    setEditorState({
      isOpen: false,
      type: 'create',
      planId: null,
      draftPlan: null,
    })
    setTimePickerTarget(null)
  }

  const openCreateEditor = () => {
    const nextName = resolveNextPlanName(plans)
    const draft = createPlan({
      name: nextName,
      enabled: true,
      cycles: [
        {
          days: [],
          periods: [{ start: '00:00', end: '00:00', mode: 'climate' }],
        },
      ],
    })

    setEditorState({
      isOpen: true,
      type: 'create',
      planId: null,
      draftPlan: draft,
    })
  }

  const openEditEditor = (planId) => {
    const targetPlan = plans.find((plan) => plan.id === planId)
    if (!targetPlan) {
      return
    }

    setEditorState({
      isOpen: true,
      type: 'edit',
      planId,
      draftPlan: clonePlan(targetPlan),
    })
  }

  const updateDraftPlan = (updater) => {
    setEditorState((current) => {
      if (!current.draftPlan) {
        return current
      }

      return {
        ...current,
        draftPlan: updater(current.draftPlan),
      }
    })
  }

  const handleToggleDraftEnabled = () => {
    updateDraftPlan((draft) => ({
      ...draft,
      enabled: !draft.enabled,
    }))
  }

  const handleToggleCycleDay = (cycleId, dayValue) => {
    updateDraftPlan((draft) => ({
      ...draft,
      cycles: draft.cycles.map((cycle) => {
        if (cycle.id !== cycleId) {
          return cycle
        }

        const shouldRemove = cycle.days.includes(dayValue)
        const nextDays = shouldRemove ? cycle.days.filter((day) => day !== dayValue) : [...cycle.days, dayValue]
        return {
          ...cycle,
          days: sortDays(nextDays),
        }
      }),
    }))
  }

  const handlePeriodFieldChange = (cycleId, periodId, field, value) => {
    updateDraftPlan((draft) => ({
      ...draft,
      cycles: draft.cycles.map((cycle) => {
        if (cycle.id !== cycleId) {
          return cycle
        }

        return {
          ...cycle,
          periods: cycle.periods.map((period) => {
            if (period.id !== periodId) {
              return period
            }

            if (field === 'temperature') {
              return {
                ...period,
                temperature: sanitizeTemperature(value),
              }
            }

            return {
              ...period,
              [field]: normalizeTimeValue(value),
            }
          }),
        }
      }),
    }))
  }

  const handlePeriodModeChange = (cycleId, periodId, nextMode) => {
    const safeMode = nextMode === 'constant' ? 'constant' : 'climate'
    updateDraftPlan((draft) => ({
      ...draft,
      cycles: draft.cycles.map((cycle) => {
        if (cycle.id !== cycleId) {
          return cycle
        }

        return {
          ...cycle,
          periods: cycle.periods.map((period) => {
            if (period.id !== periodId) {
              return period
            }

            return {
              ...period,
              mode: safeMode,
              temperature: safeMode === 'constant' ? period.temperature : '',
            }
          }),
        }
      }),
    }))
  }

  const handleAddPeriod = (cycleId) => {
    updateDraftPlan((draft) => ({
      ...draft,
      cycles: draft.cycles.map((cycle) => {
        if (cycle.id !== cycleId || cycle.periods.length >= MAX_PERIOD_COUNT) {
          return cycle
        }

        const lastPeriod = cycle.periods[cycle.periods.length - 1]
        const defaultTime = lastPeriod?.end ?? '00:00'
        return {
          ...cycle,
          periods: [
            ...cycle.periods,
            createPeriod({
              start: defaultTime,
              end: defaultTime,
              mode: 'climate',
            }),
          ],
        }
      }),
    }))
  }

  const handleRemovePeriod = (cycleId, periodId) => {
    updateDraftPlan((draft) => ({
      ...draft,
      cycles: draft.cycles.map((cycle) => {
        if (cycle.id !== cycleId || cycle.periods.length <= 1) {
          return cycle
        }

        return {
          ...cycle,
          periods: cycle.periods.filter((period) => period.id !== periodId),
        }
      }),
    }))
  }

  const handleAddCycle = () => {
    updateDraftPlan((draft) => {
      if (draft.cycles.length >= MAX_CYCLE_COUNT) {
        return draft
      }

      return {
        ...draft,
        cycles: [
          ...draft.cycles,
          createCycle({
            days: [],
            periods: [{ start: '00:00', end: '00:00', mode: 'climate' }],
          }),
        ],
      }
    })
  }

  const handleRemoveCycle = (cycleId) => {
    updateDraftPlan((draft) => {
      if (draft.cycles.length <= 1) {
        return draft
      }

      return {
        ...draft,
        cycles: draft.cycles.filter((cycle) => cycle.id !== cycleId),
      }
    })
  }

  const handleOpenTimePicker = (cycleId, periodId, field, value) => {
    setTimePickerTarget({
      cycleId,
      periodId,
      field,
      value: parseTimeValue(value),
    })
  }

  const handleConfirmTimePicker = (nextValue) => {
    if (!timePickerTarget) {
      return
    }

    const [rawHour = 0, rawMinute = 0] = Array.isArray(nextValue) ? nextValue : [0, 0]
    const parsedHour = Number.parseInt(String(rawHour), 10)
    const parsedMinute = Number.parseInt(String(rawMinute), 10)
    const safeHour = Number.isFinite(parsedHour) ? Math.min(Math.max(parsedHour, 0), 24) : 0
    const safeMinuteValue = Number.isFinite(parsedMinute) ? Math.min(Math.max(parsedMinute, 0), 59) : 0
    const safeMinute = safeHour === 24 ? 0 : safeMinuteValue
    const formatted = `${formatTwoDigits(safeHour)}:${formatTwoDigits(safeMinute)}`

    handlePeriodFieldChange(timePickerTarget.cycleId, timePickerTarget.periodId, timePickerTarget.field, formatted)
    setTimePickerTarget(null)
  }

  const handleConfirmEditor = () => {
    if (!draftPlan) {
      return
    }

    const normalizedPlan = createPlan({
      ...draftPlan,
      cycles: draftPlan.cycles.map((cycle) => ({
        ...cycle,
        days: sortDays(cycle.days),
        periods: cycle.periods.map((period) => ({
          ...period,
          start: normalizeTimeValue(period.start),
          end: normalizeTimeValue(period.end),
          mode: period.mode === 'constant' ? 'constant' : 'climate',
          temperature: period.mode === 'constant' ? sanitizeTemperature(period.temperature) : '',
        })),
      })),
    })

    if (isEditing) {
      setPlans((currentPlans) =>
        currentPlans.map((plan) => (plan.id === editorState.planId ? normalizedPlan : plan)),
      )
    } else {
      setPlans((currentPlans) => [...currentPlans, normalizedPlan])
    }

    closeEditor()
  }

  const handleDeletePlan = () => {
    if (!isEditing) {
      closeEditor()
      return
    }

    setPlans((currentPlans) => currentPlans.filter((plan) => plan.id !== editorState.planId))
    closeEditor()
  }

  return (
    <>
      <main className="smart-timer-page">
        <section className="smart-timer-page__mode-grid">
          <FeatureInfoCard
            icon={intelligentTimeSettingIcon}
            title="智能定时模式"
            description="自主设定工作时段区间"
            selected={pageMode === 'smart'}
            selectedBadgePosition="start"
            onClick={() => setPageMode('smart')}
            className="smart-timer-page__mode-card"
          />
          <FeatureInfoCard
            icon={day24Icon}
            title="全天候模式"
            description="7*24小时全天候运行"
            selected={pageMode === 'all-day'}
            onClick={() => setPageMode('all-day')}
            className="smart-timer-page__mode-card"
          />
        </section>

        {pageMode === 'smart' ? (
          <section className="smart-timer-page__plans-section">
            <h2 className="smart-timer-page__section-title">定时方案</h2>
            <button type="button" className="smart-timer-page__add-plan-btn" onClick={openCreateEditor}>
              <img src={circlePlusWhiteIcon} alt="" aria-hidden="true" />
              <span>新增方案</span>
            </button>

            <div className="smart-timer-page__plan-list">
              {plans.length > 0 ? (
                plans.map((plan) => (
                  <SmartTimerPlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={() => openEditEditor(plan.id)}
                    onToggle={() =>
                      setPlans((currentPlans) =>
                        currentPlans.map((item) =>
                          item.id === plan.id
                            ? {
                                ...item,
                                enabled: !item.enabled,
                              }
                            : item,
                        ),
                      )
                    }
                  />
                ))
              ) : (
                <div className="smart-timer-page__empty-card">暂无定时方案</div>
              )}
            </div>
          </section>
        ) : null}
      </main>

      {editorState.isOpen && draftPlan ? (
        <div className="smart-timer-page__editor-backdrop" role="presentation" onClick={closeEditor}>
          <section
            className="smart-timer-page__editor-modal"
            role="dialog"
            aria-modal="true"
            aria-label={isEditing ? '编辑定时' : '新增定时'}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="smart-timer-page__editor-header">
              <h3 className="smart-timer-page__editor-title">{isEditing ? '编辑定时' : '新增定时'}</h3>
              <button type="button" className="smart-timer-page__editor-close" aria-label="关闭" onClick={closeEditor}>
                <img src={closeIcon} alt="" aria-hidden="true" />
              </button>
            </header>

            <div className="smart-timer-page__editor-body">
              <section className="smart-timer-page__editor-plan-row">
                <span className="smart-timer-page__editor-plan-name">{draftPlan.name}</span>
                <ToggleSwitch
                  checked={draftPlan.enabled}
                  onToggle={handleToggleDraftEnabled}
                  className="smart-timer-page__editor-switch"
                  ariaLabel={`${draftPlan.name}${draftPlan.enabled ? '关闭' : '开启'}`}
                />
              </section>

              <div className="smart-timer-page__editor-cycle-list">
                {draftPlan.cycles.map((cycle, cycleIndex) => (
                  <section key={cycle.id} className="smart-timer-page__editor-cycle">
                    <header className="smart-timer-page__editor-cycle-head">
                      <h4 className="smart-timer-page__editor-cycle-title">周期</h4>
                      <button
                        type="button"
                        className="smart-timer-page__cycle-remove-btn"
                        aria-label={`删除第${cycleIndex + 1}个周期`}
                        onClick={() => handleRemoveCycle(cycle.id)}
                        disabled={draftPlan.cycles.length <= 1}
                      >
                        <img src={circleReduceBlackIcon} alt="" aria-hidden="true" />
                      </button>
                    </header>

                    <div className="smart-timer-page__weekday-list">
                      {WEEKDAY_OPTIONS.map((weekday) => {
                        const active = cycle.days.includes(weekday.value)
                        return (
                          <button
                            key={`${cycle.id}-${weekday.value}`}
                            type="button"
                            className={`smart-timer-page__weekday-btn${active ? ' is-active' : ''}`}
                            onClick={() => handleToggleCycleDay(cycle.id, weekday.value)}
                          >
                            {weekday.label}
                          </button>
                        )
                      })}
                    </div>

                    <h5 className="smart-timer-page__period-title">定时段</h5>

                    <div className="smart-timer-page__period-list">
                      {cycle.periods.map((period, periodIndex) => {
                        const isLastPeriod = periodIndex === cycle.periods.length - 1
                        const actionType = isLastPeriod ? 'add' : 'remove'
                        const actionDisabled =
                          actionType === 'add'
                            ? cycle.periods.length >= MAX_PERIOD_COUNT
                            : cycle.periods.length <= 1

                        return (
                          <div key={period.id} className="smart-timer-page__period-item">
                            <div className="smart-timer-page__period-row">
                              <button
                                type="button"
                                className="smart-timer-page__period-time is-start"
                                onClick={() => handleOpenTimePicker(cycle.id, period.id, 'start', period.start)}
                              >
                                {period.start}
                              </button>
                              <span className="smart-timer-page__period-dash">-</span>
                              <button
                                type="button"
                                className="smart-timer-page__period-time is-end"
                                onClick={() => handleOpenTimePicker(cycle.id, period.id, 'end', period.end)}
                              >
                                {period.end}
                              </button>

                              <SelectDropdown
                                className="smart-timer-page__period-select"
                                triggerClassName="smart-timer-page__period-select-trigger"
                                dropdownClassName="smart-timer-page__period-select-dropdown"
                                optionClassName="smart-timer-page__period-select-option"
                                options={PERIOD_MODE_OPTIONS}
                                value={period.mode}
                                onChange={(nextMode) => handlePeriodModeChange(cycle.id, period.id, nextMode)}
                                triggerAriaLabel="选择调节模式"
                                listAriaLabel="调节模式列表"
                              />

                              <button
                                type="button"
                                className="smart-timer-page__period-action"
                                aria-label={actionType === 'add' ? '新增定时段' : '删除定时段'}
                                onClick={() => {
                                  if (actionType === 'add') {
                                    handleAddPeriod(cycle.id)
                                  } else {
                                    handleRemovePeriod(cycle.id, period.id)
                                  }
                                }}
                                disabled={actionDisabled}
                              >
                                <img
                                  src={actionType === 'add' ? circlePlusBlackIcon : circleReduceBlackIcon}
                                  alt=""
                                  aria-hidden="true"
                                />
                              </button>
                            </div>

                            {period.mode === 'constant' ? (
                              <div className="smart-timer-page__period-temperature">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={2}
                                  value={period.temperature}
                                  onChange={(event) =>
                                    handlePeriodFieldChange(cycle.id, period.id, 'temperature', event.target.value)
                                  }
                                  placeholder="请输入入温度（0-50）"
                                  aria-label="定温模式温度设置"
                                />
                                <span>℃</span>
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <button
                type="button"
                className="smart-timer-page__add-cycle-btn"
                onClick={handleAddCycle}
                disabled={draftPlan.cycles.length >= MAX_CYCLE_COUNT}
              >
                <img src={circlePlusBlueIcon} alt="" aria-hidden="true" />
                <span>新增周期</span>
              </button>

              <footer className="smart-timer-page__editor-actions">
                {isEditing ? (
                  <button type="button" className="smart-timer-page__editor-action is-delete" onClick={handleDeletePlan}>
                    删除方案
                  </button>
                ) : (
                  <button type="button" className="smart-timer-page__editor-action is-cancel" onClick={closeEditor}>
                    取消
                  </button>
                )}
                <button type="button" className="smart-timer-page__editor-action is-confirm" onClick={handleConfirmEditor}>
                  确定
                </button>
              </footer>
            </div>
          </section>
        </div>
      ) : null}

      <TimePickerModal
        isOpen={Boolean(timePickerTarget)}
        title="时间选择器"
        columns={[
          {
            key: 'hour',
            options: TIME_HOURS,
            formatter: (next) => formatTwoDigits(next),
          },
          {
            key: 'minute',
            options: TIME_MINUTES,
            formatter: (next) => formatTwoDigits(next),
          },
        ]}
        value={timePickerTarget?.value ?? [0, 0]}
        onClose={() => setTimePickerTarget(null)}
        onConfirm={handleConfirmTimePicker}
      />
    </>
  )
}

export default SmartTimerPage
