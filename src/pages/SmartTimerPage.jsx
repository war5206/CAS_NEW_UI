import { useMemo, useRef, useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import SelectDropdown from '../components/SelectDropdown'
import TimePickerModal from '../components/TimePickerModal'
import NumericKeypadModal from '../components/NumericKeypadModal'
import AttentionModal from '../components/AttentionModal'
import ToggleSwitch from '../components/ToggleSwitch'
import { useActionConfirm } from '../hooks/useActionConfirm'
import { useSmartTimerPlansQuery } from '../features/settings/hooks/useSmartTimerPlansQuery'
import { buildSmartTimerPlanPayload } from '../api/adapters/smartTimer'
import {
  saveSmartTimerPlan,
  deleteSmartTimerPlan,
  toggleSmartTimerPlan,
} from '../api/modules/smartTimer'
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
const MAX_PERIOD_COUNT = 12

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
const PLAN_NAME_PREFIX = '\u65b9\u6848'
const CHINESE_NUMERAL_DIGITS = ['\u96f6', '\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d', '\u4e03', '\u516b', '\u4e5d']
const CHINESE_NUMERAL_MAP = new Map(CHINESE_NUMERAL_DIGITS.map((digit, index) => [digit, index]))
const PLAN_LEGEND_CLIMATE = '\u84dd\u8272\u4e3a\u6c14\u5019\u8865\u507f\u667a\u80fd\u8c03\u8282'
const PLAN_LEGEND_CONSTANT = '\u9ec4\u8272\u4e3a\u5b9a\u6e29\u6a21\u5f0f'
const PLAN_LEGEND_SEPARATOR = '\uFF0C'

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

function clampMinutesValue(value, minValue, maxValue) {
  return Math.min(maxValue, Math.max(minValue, value))
}

function formatMinutesToTimeValue(minutes) {
  const safeMinutes = Math.min(TOTAL_DAY_MINUTES, Math.max(0, minutes))
  return normalizeTimeValue(formatTimelineTick(safeMinutes))
}

function normalizeCyclePeriods(periods) {
  if (!Array.isArray(periods) || periods.length <= 0) {
    return periods
  }

  const lastIndex = periods.length - 1
  periods[0].start = '00:00'

  for (let index = 0; index <= lastIndex; index += 1) {
    if (index > 0) {
      periods[index].start = normalizeTimeValue(periods[index - 1].end)
    }

    const startMinutes = parseTimeToMinutes(periods[index].start)
    const minEndMinutes = startMinutes + 1
    const maxEndMinutes = TOTAL_DAY_MINUTES - (lastIndex - index)
    const rawEndMinutes = parseTimeToMinutes(periods[index].end)
    const safeEndMinutes = clampMinutesValue(rawEndMinutes, minEndMinutes, maxEndMinutes)
    periods[index].end = formatMinutesToTimeValue(safeEndMinutes)
  }

  return periods
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

function isCyclePeriodsCompleteAndContinuous(cycle) {
  const periods = Array.isArray(cycle?.periods) ? cycle.periods : []
  if (periods.length <= 0) {
    return false
  }

  let expectedStartMinutes = 0
  for (let index = 0; index < periods.length; index += 1) {
    const period = periods[index]
    const startMinutes = parseTimeToMinutes(period.start)
    const endMinutes = parseTimeToMinutes(period.end)

    if (startMinutes !== expectedStartMinutes) {
      return false
    }
    if (endMinutes <= startMinutes) {
      return false
    }

    expectedStartMinutes = endMinutes
  }

  return expectedStartMinutes === TOTAL_DAY_MINUTES
}

function resolveInvalidCycleIndexes(cycles) {
  return cycles.reduce((indexes, cycle, index) => {
    if (!isCyclePeriodsCompleteAndContinuous(cycle)) {
      indexes.push(index)
    }
    return indexes
  }, [])
}

function resolveCyclesWithoutDays(cycles) {
  return cycles.reduce((indexes, cycle, index) => {
    if (!Array.isArray(cycle?.days) || cycle.days.length <= 0) {
      indexes.push(index)
    }
    return indexes
  }, [])
}

function resolveDuplicateCycleDays(cycles) {
  const dayCountMap = new Map()
  cycles.forEach((cycle) => {
    cycle.days.forEach((day) => {
      dayCountMap.set(day, (dayCountMap.get(day) ?? 0) + 1)
    })
  })

  return [...dayCountMap.entries()].filter(([, count]) => count > 1).map(([day]) => day)
}

function areAllWeekdaysCovered(cycles) {
  const selectedDays = new Set()
  cycles.forEach((cycle) => {
    if (!Array.isArray(cycle?.days)) {
      return
    }
    cycle.days.forEach((day) => {
      if (DAY_ORDER_MAP.has(day)) {
        selectedDays.add(day)
      }
    })
  })

  return WEEKDAY_OPTIONS.every((weekday) => selectedDays.has(weekday.value))
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

function resolveEntityId(initialId) {
  if (Number.isFinite(initialId)) {
    return initialId
  }
  if (typeof initialId === 'string' && initialId.trim() !== '') {
    return initialId.trim()
  }
  return createEntityId()
}

function createPeriod(initial = {}) {
  const mode = initial.mode === 'constant' ? 'constant' : 'climate'
  return {
    id: resolveEntityId(initial.id),
    start: normalizeTimeValue(initial.start ?? '00:00'),
    end: normalizeTimeValue(initial.end ?? '00:00'),
    mode,
    temperature: mode === 'constant' ? sanitizeTemperature(initial.temperature) : '',
  }
}

function createCycle(initial = {}) {
  const sourcePeriods = Array.isArray(initial.periods) ? initial.periods : [{}]
  return {
    id: resolveEntityId(initial.id),
    days: sortDays(Array.isArray(initial.days) ? initial.days : []),
    periods: sourcePeriods.map((period) => createPeriod(period)),
  }
}

function createPlan(initial = {}) {
  const sourceCycles = Array.isArray(initial.cycles) && initial.cycles.length > 0 ? initial.cycles : [{}]
  return {
    id: resolveEntityId(initial.id),
    name: sanitizePlanName(initial.name),
    enabled: initial.enabled !== false,
    pageMode: initial.pageMode === 'all-day' ? 'all-day' : 'smart',
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
        startMinutes: 0,
        endMinutes: TOTAL_DAY_MINUTES,
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
        startMinutes: cursor,
        endMinutes: start,
        duration: start - cursor,
        label: '',
      })
    }

    const effectiveStart = Math.max(cursor, start)
    if (end > effectiveStart) {
      const previousSegment = segments.length > 0 ? segments[segments.length - 1] : null
      const showDivider =
        previousSegment?.type === period.mode && previousSegment.type !== 'empty' && start <= cursor

      segments.push({
        key: `period-${period.id}`,
        type: period.mode,
        startMinutes: effectiveStart,
        endMinutes: end,
        duration: end - effectiveStart,
        label: resolvePeriodLabel(period),
        showDivider,
      })
      cursor = end
    }
  })

  if (cursor < TOTAL_DAY_MINUTES) {
    segments.push({
      key: `tail-${cursor}`,
      type: 'empty',
      startMinutes: cursor,
      endMinutes: TOTAL_DAY_MINUTES,
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

function parseChineseNumeralNumber(value) {
  const text = String(value ?? '').trim()
  if (!text) {
    return null
  }

  if (text === '\u5341') {
    return 10
  }

  const tenIndex = text.indexOf('\u5341')
  if (tenIndex >= 0) {
    const [tenPart, unitPart] = text.split('\u5341')
    const tenValue = tenPart ? CHINESE_NUMERAL_MAP.get(tenPart) : 1
    const unitValue = unitPart ? CHINESE_NUMERAL_MAP.get(unitPart) : 0

    if (!Number.isFinite(tenValue) || !Number.isFinite(unitValue)) {
      return null
    }

    return tenValue * 10 + unitValue
  }

  if (text.length === 1 && CHINESE_NUMERAL_MAP.has(text)) {
    return CHINESE_NUMERAL_MAP.get(text)
  }

  return null
}

function formatNumberToChineseNumeral(value) {
  if (!Number.isInteger(value) || value <= 0) {
    return String(value)
  }

  if (value < 10) {
    return CHINESE_NUMERAL_DIGITS[value]
  }

  if (value < 20) {
    const unit = value % 10
    return `\u5341${unit > 0 ? CHINESE_NUMERAL_DIGITS[unit] : ''}`
  }

  if (value < 100) {
    const ten = Math.floor(value / 10)
    const unit = value % 10
    return `${CHINESE_NUMERAL_DIGITS[ten]}\u5341${unit > 0 ? CHINESE_NUMERAL_DIGITS[unit] : ''}`
  }

  return String(value)
}

function resolvePlanIndexFromName(name) {
  const matched = String(name ?? '')
    .trim()
    .match(/^\u65b9\u6848(.+)$/)
  if (!matched) {
    return null
  }

  const suffix = matched[1].trim()
  if (/^\d+$/.test(suffix)) {
    const parsed = Number.parseInt(suffix, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  const parsedChineseNumber = parseChineseNumeralNumber(suffix)
  return Number.isFinite(parsedChineseNumber) && parsedChineseNumber > 0 ? parsedChineseNumber : null
}

function resolveNextPlanNameByStyle(plans) {
  const usedIndexes = new Set(plans.map((plan) => resolvePlanIndexFromName(plan.name)).filter((value) => Number.isFinite(value)))

  const hasChineseNamedPlan = plans.some((plan) => {
    const matched = String(plan?.name ?? '')
      .trim()
      .match(/^\u65b9\u6848(.+)$/)
    if (!matched) {
      return false
    }
    return Number.isFinite(parseChineseNumeralNumber(matched[1].trim()))
  })

  let index = 1
  while (usedIndexes.has(index)) {
    index += 1
  }

  const suffix = hasChineseNamedPlan ? formatNumberToChineseNumeral(index) : String(index)
  return `${PLAN_NAME_PREFIX}${suffix}`
}

// eslint-disable-next-line no-unused-vars
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

function resolveLowerTickMinuteKeys(ticks) {
  const lowerTickMinuteKeys = new Set()
  if (!Array.isArray(ticks) || ticks.length <= 2) {
    return lowerTickMinuteKeys
  }

  const isShortRange = (startMinutes, endMinutes) => {
    const durationMinutes = endMinutes - startMinutes
    const hourValue = Math.floor(endMinutes / 60)
    const thresholdMinutes = hourValue < 10 ? 40 : 50
    return durationMinutes < thresholdMinutes
  }

  let rangeIndex = 1
  while (rangeIndex < ticks.length) {
    const rangeStartMinutes = ticks[rangeIndex - 1]
    const rangeEndMinutes = ticks[rangeIndex]

    if (!isShortRange(rangeStartMinutes, rangeEndMinutes)) {
      rangeIndex += 1
      continue
    }

    let runStartRangeIndex = rangeIndex
    let runEndRangeIndex = rangeIndex

    while (
      runEndRangeIndex + 1 < ticks.length &&
      isShortRange(ticks[runEndRangeIndex], ticks[runEndRangeIndex + 1])
    ) {
      runEndRangeIndex += 1
    }

    for (let shortRangeIndex = runStartRangeIndex; shortRangeIndex <= runEndRangeIndex; shortRangeIndex += 1) {
      const shouldLower = (shortRangeIndex - runStartRangeIndex) % 2 === 0
      const tickMinutes = ticks[shortRangeIndex]

      // Endpoints stay on top; only internal boundary ticks may be lowered.
      if (shouldLower && tickMinutes > 0 && tickMinutes < TOTAL_DAY_MINUTES) {
        lowerTickMinuteKeys.add(String(tickMinutes))
      }
    }

    rangeIndex = runEndRangeIndex + 1
  }

  return lowerTickMinuteKeys
}

function SmartTimerPlanCard({ plan, onEdit, onToggle, toggleConfirmConfig }) {
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
          confirmConfig={toggleConfirmConfig}
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
            const lowerTickKeys = resolveLowerTickMinuteKeys(ticks)
            return (
              <section
                key={cycle.id}
                className={`smart-timer-page__cycle-block${lowerTickKeys.size > 0 ? ' has-lower-ticks' : ''}`}
              >
                <div className={`smart-timer-page__cycle-days${isEmptyCycle ? ' is-chip' : ''}`}>{resolveCycleDayText(cycle.days)}</div>

                <div className="smart-timer-page__timeline-ticks">
                  {ticks.map((tickMinutes) => {
                    const position = (tickMinutes / TOTAL_DAY_MINUTES) * 100
                    const tickText = formatTimelineTick(tickMinutes)
                    const [hourText = '0', minuteText = '00'] = tickText.split(':')
                    const isStartTick = tickMinutes === 0
                    const isEndTick = tickMinutes === TOTAL_DAY_MINUTES
                    const isLowerTick = !isStartTick && !isEndTick && lowerTickKeys.has(String(tickMinutes))
                    const tickClassName = [
                      'smart-timer-page__timeline-tick',
                      isStartTick ? 'is-start' : '',
                      isEndTick ? 'is-end' : '',
                      !isStartTick && !isEndTick ? 'is-middle' : '',
                      isLowerTick ? 'is-lower' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <span key={`${cycle.id}-${tickMinutes}`} className={tickClassName} style={{ left: `${position}%` }}>
                        {isStartTick || isEndTick ? (
                          tickText
                        ) : (
                          <>
                            <span className="smart-timer-page__timeline-tick-hour">{hourText}</span>
                            <span className="smart-timer-page__timeline-tick-colon">:</span>
                            <span className="smart-timer-page__timeline-tick-minute">{minuteText}</span>
                          </>
                        )}
                      </span>
                    )
                  })}
                </div>

                <div className={`smart-timer-page__timeline-track${isEmptyCycle ? ' is-empty' : ''}`}>
                  {segments.map((segment) => {
                    const segmentClassName = [
                      'smart-timer-page__timeline-segment',
                      `is-${segment.type}`,
                      segment.showDivider ? 'has-divider' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <div
                        key={`${cycle.id}-${segment.key}`}
                        className={segmentClassName}
                        style={{
                          left: `${(segment.startMinutes / TOTAL_DAY_MINUTES) * 100}%`,
                          width: `${(segment.duration / TOTAL_DAY_MINUTES) * 100}%`,
                        }}
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
  const { requestConfirm, confirmModal } = useActionConfirm()
  const [pageMode, setPageMode] = useState('smart')
  const { data: plansQueryData, refetch: refetchPlans } = useSmartTimerPlansQuery({
    enabled: pageMode === 'smart',
  })
  const plans = useMemo(() => {
    const rawPlans = Array.isArray(plansQueryData?.plans) ? plansQueryData.plans : []
    return rawPlans.map((plan) => createPlan(plan))
  }, [plansQueryData])
  const [editorState, setEditorState] = useState({
    isOpen: false,
    type: 'create',
    planId: null,
    draftPlan: null,
  })
  const [timePickerTarget, setTimePickerTarget] = useState(null)
  const [temperatureKeypadTarget, setTemperatureKeypadTarget] = useState(null)
  const [attentionModalMessage, setAttentionModalMessage] = useState('')
  const [isMutating, setIsMutating] = useState(false)
  const [isEditorDragging, setIsEditorDragging] = useState(false)
  const editorBodyRef = useRef(null)
  const editorDragStateRef = useRef({
    startY: 0,
    startScrollTop: 0,
  })
  const draftPlan = editorState.draftPlan
  const isEditing = editorState.type === 'edit'

  const showAttentionModal = (message) => {
    setAttentionModalMessage(String(message ?? '').trim())
  }

  const closeAttentionModal = () => {
    setAttentionModalMessage('')
  }

  const closeEditor = () => {
    setEditorState({
      isOpen: false,
      type: 'create',
      planId: null,
      draftPlan: null,
    })
    setTimePickerTarget(null)
    setTemperatureKeypadTarget(null)
    setIsEditorDragging(false)
  }

  const handleEditorBodyMouseDown = (event) => {
    if (event.button !== 0) {
      return
    }

    const targetElement = event.target
    if (
      targetElement instanceof Element &&
      targetElement.closest('button, input, textarea, select, a, [role="button"], [data-no-drag-scroll="true"]')
    ) {
      return
    }

    const container = editorBodyRef.current
    if (!container) {
      return
    }

    editorDragStateRef.current = {
      startY: event.clientY,
      startScrollTop: container.scrollTop,
    }
    setIsEditorDragging(true)

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - editorDragStateRef.current.startY
      container.scrollTop = editorDragStateRef.current.startScrollTop - deltaY
    }

    const handleMouseUp = () => {
      setIsEditorDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const openCreateEditor = () => {
    const nextName = resolveNextPlanNameByStyle(plans)
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
    updateDraftPlan((draft) => {
      const usedByOtherCycles = new Set(
        draft.cycles.filter((cycle) => cycle.id !== cycleId).flatMap((cycle) => cycle.days),
      )

      return {
        ...draft,
        cycles: draft.cycles.map((cycle) => {
          if (cycle.id !== cycleId) {
            return cycle
          }

          const shouldRemove = cycle.days.includes(dayValue)
          if (!shouldRemove && usedByOtherCycles.has(dayValue)) {
            return cycle
          }

          const nextDays = shouldRemove ? cycle.days.filter((day) => day !== dayValue) : [...cycle.days, dayValue]
          return {
            ...cycle,
            days: sortDays(nextDays),
          }
        }),
      }
    })
  }

  const handlePeriodFieldChange = (cycleId, periodId, field, value) => {
    updateDraftPlan((draft) => ({
      ...draft,
      cycles: draft.cycles.map((cycle) => {
        if (cycle.id !== cycleId) {
          return cycle
        }

        if (field === 'temperature') {
          return {
            ...cycle,
            periods: cycle.periods.map((period) => {
              if (period.id !== periodId) {
                return period
              }

              return {
                ...period,
                temperature: sanitizeTemperature(value),
              }
            }),
          }
        }

        const periodIndex = cycle.periods.findIndex((period) => period.id === periodId)
        if (periodIndex < 0) {
          return cycle
        }

        const nextPeriods = cycle.periods.map((period) => ({ ...period }))
        const inputMinutes = parseTimeToMinutes(value)
        const lastIndex = nextPeriods.length - 1

        if (field === 'start') {
          if (periodIndex <= 0) {
            nextPeriods[0].start = '00:00'
          } else {
            const previousPeriod = nextPeriods[periodIndex - 1]
            const minBoundary = parseTimeToMinutes(previousPeriod.start) + 1
            const maxBoundary = TOTAL_DAY_MINUTES - (lastIndex - periodIndex + 1)
            const safeBoundary = clampMinutesValue(inputMinutes, minBoundary, maxBoundary)
            const boundaryText = formatMinutesToTimeValue(safeBoundary)

            nextPeriods[periodIndex].start = boundaryText
            nextPeriods[periodIndex - 1].end = boundaryText
          }
        } else if (field === 'end') {
          const currentPeriod = nextPeriods[periodIndex]
          const minBoundary = parseTimeToMinutes(currentPeriod.start) + 1
          const maxBoundary = TOTAL_DAY_MINUTES - (lastIndex - periodIndex)
          const safeBoundary = clampMinutesValue(inputMinutes, minBoundary, maxBoundary)
          const boundaryText = formatMinutesToTimeValue(safeBoundary)

          nextPeriods[periodIndex].end = boundaryText
          if (periodIndex < lastIndex) {
            nextPeriods[periodIndex + 1].start = boundaryText
          }
        }

        normalizeCyclePeriods(nextPeriods)

        return {
          ...cycle,
          periods: nextPeriods,
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

        const removedIndex = cycle.periods.findIndex((period) => period.id === periodId)
        if (removedIndex < 0) {
          return cycle
        }

        const nextPeriods = cycle.periods.filter((period) => period.id !== periodId).map((period) => ({ ...period }))
        const lastIndex = nextPeriods.length - 1

        if (nextPeriods.length > 0) {
          nextPeriods[0].start = '00:00'

          if (removedIndex > 0 && removedIndex <= lastIndex) {
            nextPeriods[removedIndex].start = nextPeriods[removedIndex - 1].end
          }
        }

        return {
          ...cycle,
          periods: nextPeriods,
        }
      }),
    }))
  }

  const handleAddCycle = () => {
    if (!draftPlan) {
      return
    }
    if (draftPlan.cycles.length >= MAX_CYCLE_COUNT) {
      return
    }

    const invalidCycleIndexes = resolveInvalidCycleIndexes(draftPlan.cycles)
    if (invalidCycleIndexes.length > 0) {
      showAttentionModal('新增周期前，已有周期必须连续且覆盖24小时。')
      return
    }

    updateDraftPlan((draft) => ({
      ...draft,
      cycles: [
        ...draft.cycles,
        createCycle({
          days: [],
          periods: [{ start: '00:00', end: '00:00', mode: 'climate' }],
        }),
      ],
    }))
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

  const handleOpenTemperatureKeypad = (cycleId, periodId, value) => {
    setTemperatureKeypadTarget({
      cycleId,
      periodId,
      value: sanitizeTemperature(value),
    })
  }

  const handleConfirmTemperatureKeypad = (nextValue) => {
    if (!temperatureKeypadTarget) {
      return
    }

    handlePeriodFieldChange(
      temperatureKeypadTarget.cycleId,
      temperatureKeypadTarget.periodId,
      'temperature',
      sanitizeTemperature(nextValue),
    )
    setTemperatureKeypadTarget(null)
  }

  const handleConfirmEditor = async () => {
    if (!draftPlan || isMutating) {
      return
    }

    const emptyDayCycleIndexes = resolveCyclesWithoutDays(draftPlan.cycles)
    if (emptyDayCycleIndexes.length > 0) {
      const cycleText = emptyDayCycleIndexes.map((index) => index + 1).join(', ')
      showAttentionModal(`周期 ${cycleText} 必须至少选择一个星期。`)
      return
    }

    const invalidCycleIndexes = resolveInvalidCycleIndexes(draftPlan.cycles)
    if (invalidCycleIndexes.length > 0) {
      const cycleText = invalidCycleIndexes.map((index) => index + 1).join(', ')
      showAttentionModal(`周期 ${cycleText} 必须连续且覆盖24小时。`)
      return
    }

    const duplicateDays = resolveDuplicateCycleDays(draftPlan.cycles)
    if (duplicateDays.length > 0) {
      showAttentionModal('周期间星期不能重复。')
      return
    }

    if (!areAllWeekdaysCovered(draftPlan.cycles)) {
      showAttentionModal('所有周期加起来必须覆盖周一至周日。')
      return
    }

    const planForPayload = {
      id: isEditing ? editorState.planId : null,
      name: draftPlan.name,
      enabled: draftPlan.enabled,
      pageMode: draftPlan.pageMode ?? pageMode,
      cycles: draftPlan.cycles.map((cycle) => ({
        days: sortDays(cycle.days),
        periods: cycle.periods.map((period) => ({
          start: normalizeTimeValue(period.start),
          end: normalizeTimeValue(period.end),
          mode: period.mode === 'constant' ? 'constant' : 'climate',
          temperature: period.mode === 'constant' ? sanitizeTemperature(period.temperature) : '',
        })),
      })),
    }

    const planJson = buildSmartTimerPlanPayload(planForPayload)
    if (!planJson) {
      showAttentionModal('当前方案数据无效，无法保存。')
      return
    }

    setIsMutating(true)
    try {
      const response = await saveSmartTimerPlan(planJson)
      const responseData = response?.data ?? {}
      if (responseData.state !== 'success') {
        showAttentionModal(responseData.message || '保存方案失败，请稍后再试。')
        return
      }

      closeEditor()
      await refetchPlans()
    } catch (error) {
      showAttentionModal(error?.message || '保存方案失败，请检查网络。')
    } finally {
      setIsMutating(false)
    }
  }

  const handleDeletePlan = async () => {
    if (!isEditing) {
      closeEditor()
      return
    }
    if (isMutating) {
      return
    }

    const targetPlanId = editorState.planId
    if (targetPlanId == null || String(targetPlanId).trim() === '') {
      closeEditor()
      return
    }

    setIsMutating(true)
    try {
      const response = await deleteSmartTimerPlan(targetPlanId)
      const responseData = response?.data ?? {}
      if (responseData.state !== 'success') {
        showAttentionModal(responseData.message || '删除方案失败，请稍后再试。')
        return
      }

      closeEditor()
      await refetchPlans()
    } catch (error) {
      showAttentionModal(error?.message || '删除方案失败，请检查网络。')
    } finally {
      setIsMutating(false)
    }
  }

  const handleTogglePlan = async (plan) => {
    if (!plan || isMutating) {
      return
    }

    const nextEnabled = !plan.enabled
    setIsMutating(true)
    try {
      const response = await toggleSmartTimerPlan({ id: plan.id, enabled: nextEnabled })
      const responseData = response?.data ?? {}
      if (responseData.state !== 'success') {
        showAttentionModal(responseData.message || '切换方案状态失败，请稍后再试。')
        return
      }

      await refetchPlans()
    } catch (error) {
      showAttentionModal(error?.message || '切换方案状态失败，请检查网络。')
    } finally {
      setIsMutating(false)
    }
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
            confirmConfig={pageMode === 'smart' ? null : { message: '确认切换为智能定时模式吗？' }}
            className="smart-timer-page__mode-card"
          />
          <FeatureInfoCard
            icon={day24Icon}
            title="全天候模式"
            description="7*24小时全天候运行"
            selected={pageMode === 'all-day'}
            onClick={() => setPageMode('all-day')}
            confirmConfig={pageMode === 'all-day' ? null : { message: '确认切换为全天候模式吗？' }}
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
            <p className="smart-timer-page__plan-tip">
              <span className="smart-timer-page__plan-tip-key is-climate">{PLAN_LEGEND_CLIMATE}</span>
              <span className="smart-timer-page__plan-tip-separator">{PLAN_LEGEND_SEPARATOR}</span>
              <span className="smart-timer-page__plan-tip-key is-constant">{PLAN_LEGEND_CONSTANT}</span>
            </p>

            <div className="smart-timer-page__plan-list">
              {plans.length > 0 ? (
                plans.map((plan) => (
                  <SmartTimerPlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={() => openEditEditor(plan.id)}
                    onToggle={() => handleTogglePlan(plan)}
                    toggleConfirmConfig={({ nextChecked }) => ({
                      message: `确认${nextChecked ? '开启' : '关闭'}${plan.name}吗？`,
                    })}
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

            <div
              ref={editorBodyRef}
              className={`smart-timer-page__editor-body${isEditorDragging ? ' is-dragging' : ''}`}
              onMouseDown={handleEditorBodyMouseDown}
            >
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
                      <h4 className="smart-timer-page__editor-cycle-title">{`周期${cycleIndex + 1}`}</h4>
                      <button
                        type="button"
                        className="smart-timer-page__cycle-remove-btn"
                        aria-label={`删除周期${cycleIndex + 1}`}
                        onClick={() => handleRemoveCycle(cycle.id)}
                        disabled={draftPlan.cycles.length <= 1}
                      >
                        <img src={circleReduceBlackIcon} alt="" aria-hidden="true" />
                      </button>
                    </header>

                    <div className="smart-timer-page__weekday-list">
                      {WEEKDAY_OPTIONS.map((weekday) => {
                        const active = cycle.days.includes(weekday.value)
                        const selectedInOtherCycle = draftPlan.cycles.some(
                          (otherCycle, otherIndex) => otherIndex !== cycleIndex && otherCycle.days.includes(weekday.value),
                        )
                        const disabled = !active && selectedInOtherCycle
                        return (
                          <button
                            key={`${cycle.id}-${weekday.value}`}
                            type="button"
                            className={`smart-timer-page__weekday-btn${active ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
                            onClick={() => handleToggleCycleDay(cycle.id, weekday.value)}
                            disabled={disabled}
                          >
                            {weekday.label}
                          </button>
                        )
                      })}
                    </div>

                    <h5 className="smart-timer-page__period-title">定时段</h5>

                    <div className="smart-timer-page__period-list">
                      {cycle.periods.map((period, periodIndex) => {
                        const isFirstPeriod = periodIndex === 0
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
                                disabled={isFirstPeriod}
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
                                  inputMode="none"
                                  readOnly
                                  maxLength={2}
                                  value={period.temperature}
                                  onClick={() => handleOpenTemperatureKeypad(cycle.id, period.id, period.temperature)}
                                  onFocus={(event) => {
                                    event.target.blur()
                                    handleOpenTemperatureKeypad(cycle.id, period.id, period.temperature)
                                  }}
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
                  <button
                    type="button"
                    className="smart-timer-page__editor-action is-delete"
                    onClick={() => requestConfirm({ message: '确认删除当前定时方案吗？', zIndex: 320 }, handleDeletePlan)}
                    disabled={isMutating}
                  >
                    删除方案
                  </button>
                ) : (
                  <button
                    type="button"
                    className="smart-timer-page__editor-action is-cancel"
                    onClick={closeEditor}
                    disabled={isMutating}
                  >
                    取消
                  </button>
                )}
                <button
                  type="button"
                  className="smart-timer-page__editor-action is-confirm"
                  onClick={() => requestConfirm({ message: '确认保存当前定时方案吗？', zIndex: 320 }, handleConfirmEditor)}
                  disabled={isMutating}
                >
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
        showBackdrop={false}
        zIndex={260}
      />

      <NumericKeypadModal
        isOpen={Boolean(temperatureKeypadTarget)}
        initialValue={temperatureKeypadTarget?.value ?? ''}
        onClose={() => setTemperatureKeypadTarget(null)}
        onConfirm={handleConfirmTemperatureKeypad}
        showBackdrop={false}
        zIndex={260}
      />

      <AttentionModal
        isOpen={Boolean(attentionModalMessage)}
        title="提示"
        message={attentionModalMessage}
        confirmText="确认"
        onClose={closeAttentionModal}
        onConfirm={closeAttentionModal}
        zIndex={300}
      />
      {confirmModal}
    </>
  )
}

export default SmartTimerPage
