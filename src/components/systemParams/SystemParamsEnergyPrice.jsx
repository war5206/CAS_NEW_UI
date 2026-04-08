import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import NumericKeypadModal from '../NumericKeypadModal'
import TimePickerModal from '../TimePickerModal'
import AttentionModal from '../AttentionModal'
import addIcon from '../../assets/icons/add.svg'
import editIcon from '../../assets/edit.svg'
import { saveEnergyPricePlan } from '../../api/modules/home'
import {
  ENERGY_PRICE_SEGMENT_COLORS,
  getStoredEnergyPriceState,
  setStoredEnergyPriceState,
} from '../../utils/energyPriceState'

/** 与后端尖峰平谷命名一致；按时段顺序循环映射 */
const SEGMENT_ENERGY_NAMES = ['峰电', '谷电', '平电', '深谷电']

function segmentUiTimeToApi(time) {
  if (!time || typeof time !== 'string') return '00:00:00'
  if (time === '24:00') return '00:00:00'
  const [h, m] = time.split(':')
  const hh = String(Number(h) || 0).padStart(2, '0')
  const mm = String(Number(m) || 0).padStart(2, '0')
  return `${hh}:${mm}:00`
}

const ENERGY_PRICE_TABS = [
  { value: 'water', label: '水' },
  { value: 'electricity', label: '电' },
  { value: 'gas', label: '气' },
]

const DATE_PICKER_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DATE_PICKER_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const TIME_PICKER_HOURS = Array.from({ length: 25 }, (_, index) => index)
const TIME_PICKER_MINUTES = Array.from({ length: 60 }, (_, index) => index)

const ENERGY_PRICE_PLAN_TIME_INVALID_MESSAGE = '时段价格设置需覆盖24小时：首段开始时间必须为00:00，末段结束时间必须为24:00。'
const ENERGY_PRICE_SEGMENT_INVALID_MESSAGE = '时段设置无效：每段结束时间必须晚于开始时间。'

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function parseTimeToMinutes(value) {
  if (!value || typeof value !== 'string') return 0
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return 0
  return Math.min(24 * 60, Math.max(0, hour * 60 + minute))
}

function formatMinutesToTime(totalMinutes) {
  const safe = Math.min(24 * 60, Math.max(0, Number(totalMinutes) || 0))
  const hour = Math.floor(safe / 60)
  const minute = safe % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseMonthDay(value) {
  if (!value || typeof value !== 'string') return [1, 1]
  const [monthText, dayText] = value.split('-')
  const month = Number(monthText)
  const day = Number(dayText)
  const safeMonth = Number.isInteger(month) && month >= 1 && month <= 12 ? month : 1
  const safeDay = Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1
  return [safeMonth, safeDay]
}

function formatMonthDay(month, day) {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatMonthDayText(value) {
  const [month, day] = parseMonthDay(value)
  return `${month}月${day}日`
}

function parseTimeValue(value) {
  if (!value || typeof value !== 'string') return [0, 0]
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const safeHour = Number.isInteger(hour) && hour >= 0 && hour <= 24 ? hour : 0
  const safeMinute = Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : 0
  return [safeHour, safeMinute]
}

function normalizeEnergyPlanDraftSegments(segments) {
  const source = Array.isArray(segments) ? segments : []
  if (source.length === 0) {
    return [{ start: '00:00', end: '24:00', price: '', color: ENERGY_PRICE_SEGMENT_COLORS[0] }]
  }

  const normalized = source.map((segment, index) => ({
    ...segment,
    start: formatMinutesToTime(parseTimeToMinutes(segment?.start)),
    end: formatMinutesToTime(parseTimeToMinutes(segment?.end)),
    price: segment?.price ?? '',
    color: segment?.color ?? ENERGY_PRICE_SEGMENT_COLORS[index % ENERGY_PRICE_SEGMENT_COLORS.length],
  }))

  normalized[0].start = '00:00'
  for (let index = 1; index < normalized.length; index += 1) {
    normalized[index - 1].end = normalized[index].start
  }

  return normalized
}

const SystemParamsEnergyPrice = forwardRef(function SystemParamsEnergyPrice(
  { variant = 'settings', settingsHeader = null, onDirtyChange },
  ref,
) {
  const [energyPriceState, setEnergyPriceState] = useState(() => getStoredEnergyPriceState())
  const [savedEnergyPriceState, setSavedEnergyPriceState] = useState(() => getStoredEnergyPriceState())
  const [energyPriceModalOpen, setEnergyPriceModalOpen] = useState(false)
  const [editingEnergyPlanId, setEditingEnergyPlanId] = useState(null)
  /** 编辑打开弹窗时的原方案日期，用于保存时 clear 旧区间 */
  const [editingPlanRangeBeforeEdit, setEditingPlanRangeBeforeEdit] = useState(null)
  const [energyPricePlanSaving, setEnergyPricePlanSaving] = useState(false)
  const [energyPriceModalDraft, setEnergyPriceModalDraft] = useState({ startDate: '01-01', endDate: '12-31', segments: [] })
  const [energyPricePickerState, setEnergyPricePickerState] = useState({ open: false, type: null, segmentIndex: null })
  const [keypadState, setKeypadState] = useState({ open: false, field: null, moduleKey: null })
  const [alertDialog, setAlertDialog] = useState({ open: false, title: '', message: '' })

  const energyPricePickerValue = useMemo(() => {
    if (!energyPricePickerState.open) return []
    if (energyPricePickerState.type === 'startDate') return parseMonthDay(energyPriceModalDraft.startDate)
    if (energyPricePickerState.type === 'endDate') return parseMonthDay(energyPriceModalDraft.endDate)
    if (energyPricePickerState.type === 'segment-start') return parseTimeValue(energyPriceModalDraft.segments[energyPricePickerState.segmentIndex]?.start)
    if (energyPricePickerState.type === 'segment-end') return parseTimeValue(energyPriceModalDraft.segments[energyPricePickerState.segmentIndex]?.end)
    return []
  }, [energyPriceModalDraft, energyPricePickerState])

  const isDirty = useMemo(
    () => JSON.stringify(energyPriceState) !== JSON.stringify(savedEnergyPriceState),
    [energyPriceState, savedEnergyPriceState],
  )

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const openAlertDialog = useCallback((title, message) => {
    setAlertDialog({ open: true, title, message })
  }, [])

  const closeAlertDialog = useCallback(() => {
    setAlertDialog({ open: false, title: '', message: '' })
  }, [])

  const commit = useCallback(() => {
    const hasInvalidPlanTime = energyPriceState.electricPlans.some((plan) => {
      const segments = Array.isArray(plan?.segments) ? plan.segments : []
      if (segments.length === 0) return true
      return segments[0]?.start !== '00:00' || segments[segments.length - 1]?.end !== '24:00'
    })
    if (hasInvalidPlanTime) {
      openAlertDialog('提示', ENERGY_PRICE_PLAN_TIME_INVALID_MESSAGE)
      return false
    }
    setSavedEnergyPriceState(deepClone(energyPriceState))
    setStoredEnergyPriceState(energyPriceState)
    return true
  }, [energyPriceState, openAlertDialog])

  useImperativeHandle(ref, () => ({ commit }), [commit])

  const openNumberPad = (field, moduleKey = null) => {
    setKeypadState({ open: true, field, moduleKey })
  }

  const handleKeypadConfirm = (value) => {
    if (keypadState.moduleKey === 'energy-water') {
      setEnergyPriceState((previous) => ({ ...previous, waterFixed: value }))
    } else if (keypadState.moduleKey === 'energy-gas') {
      setEnergyPriceState((previous) => ({ ...previous, gasFixed: value }))
    } else if (keypadState.moduleKey === 'energy-plan-price' && Number.isInteger(keypadState.field)) {
      setEnergyPriceModalDraft((previous) => ({
        ...previous,
        segments: previous.segments.map((segment, index) => (index === keypadState.field ? { ...segment, price: value } : segment)),
      }))
    }
    setKeypadState({ open: false, field: null, moduleKey: null })
  }

  const handleEnergyPricePickerConfirm = (nextValueParts) => {
    if (!Array.isArray(nextValueParts) || nextValueParts.length < 2) {
      setEnergyPricePickerState({ open: false, type: null, segmentIndex: null })
      return
    }

    const [rawA, rawB] = nextValueParts.map((item) => Number(item))
    const a = Number.isInteger(rawA) ? rawA : 0
    const b = Number.isInteger(rawB) ? rawB : 0

    if (energyPricePickerState.type === 'startDate' || energyPricePickerState.type === 'endDate') {
      const month = Math.min(12, Math.max(1, a))
      const maxDay = new Date(2024, month, 0).getDate()
      const day = Math.min(maxDay, Math.max(1, b))
      setEnergyPriceModalDraft((previous) => ({
        ...previous,
        [energyPricePickerState.type]: formatMonthDay(month, day),
      }))
    } else if ((energyPricePickerState.type === 'segment-start' || energyPricePickerState.type === 'segment-end') && Number.isInteger(energyPricePickerState.segmentIndex)) {
      const hour = Math.min(24, Math.max(0, a))
      const minute = Math.min(59, Math.max(0, b))
      const nextTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const targetIndex = energyPricePickerState.segmentIndex
      setEnergyPriceModalDraft((previous) => ({
        ...previous,
        segments: previous.segments.map((segment, index) => {
          if (energyPricePickerState.type === 'segment-start') {
            if (index === 0) {
              return { ...segment, start: '00:00' }
            }
            if (index === targetIndex) {
              return { ...segment, start: nextTime }
            }
            if (index === targetIndex - 1) {
              return { ...segment, end: nextTime }
            }
            return segment
          }

          if (index === targetIndex) {
            return { ...segment, end: nextTime }
          }
          if (index === targetIndex + 1) {
            return { ...segment, start: nextTime }
          }
          return segment
        }),
      }))
    }

    setEnergyPricePickerState({ open: false, type: null, segmentIndex: null })
  }

  const isWater = energyPriceState.tab === 'water'
  const isElectricity = energyPriceState.tab === 'electricity'
  const isGas = energyPriceState.tab === 'gas'

  const openEnergyPriceModal = (plan = null) => {
    if (plan) {
      setEditingEnergyPlanId(plan.id)
      setEditingPlanRangeBeforeEdit({
        startDate: plan.startDate ?? '01-01',
        endDate: plan.endDate ?? '12-31',
      })
      setEnergyPriceModalDraft({
        startDate: plan.startDate ?? '01-01',
        endDate: plan.endDate ?? '12-31',
        segments: normalizeEnergyPlanDraftSegments(deepClone(plan.segments ?? [])),
      })
    } else {
      setEditingEnergyPlanId(null)
      setEditingPlanRangeBeforeEdit(null)
      setEnergyPriceModalDraft({
        startDate: '01-01',
        endDate: '12-31',
        segments: [{ start: '00:00', end: '24:00', price: '', color: ENERGY_PRICE_SEGMENT_COLORS[0] }],
      })
    }
    setEnergyPriceModalOpen(true)
  }

  const closeEnergyPriceModal = () => {
    setEnergyPriceModalOpen(false)
    setEditingEnergyPlanId(null)
    setEditingPlanRangeBeforeEdit(null)
    setEnergyPricePickerState({ open: false, type: null, segmentIndex: null })
  }

  const handleAddEnergyPlanDraftSegment = () => {
    const last = energyPriceModalDraft.segments.at(-1)
    const lastEndMinutes = parseTimeToMinutes(last?.end ?? '00:00')
    if (lastEndMinutes >= 24 * 60) return
    const nextStart = formatMinutesToTime(lastEndMinutes)
    setEnergyPriceModalDraft((previous) => ({
      ...previous,
      segments: [
        ...previous.segments,
        { start: nextStart, end: '24:00', price: '', color: ENERGY_PRICE_SEGMENT_COLORS[previous.segments.length % ENERGY_PRICE_SEGMENT_COLORS.length] },
      ],
    }))
  }

  const handleRemoveEnergyPlanDraftSegment = (index) => {
    setEnergyPriceModalDraft((previous) => ({
      ...previous,
      segments: normalizeEnergyPlanDraftSegments(previous.segments.filter((_, segmentIndex) => segmentIndex !== index)),
    }))
  }

  const canAddEnergyPriceSegment = parseTimeToMinutes(energyPriceModalDraft.segments.at(-1)?.end ?? '00:00') < 24 * 60

  const handleConfirmEnergyPlanModal = async () => {
    const hasInvalidDraftSegment = energyPriceModalDraft.segments.some(
      (segment) => parseTimeToMinutes(segment?.end) <= parseTimeToMinutes(segment?.start),
    )
    if (hasInvalidDraftSegment) {
      openAlertDialog('提示', ENERGY_PRICE_SEGMENT_INVALID_MESSAGE)
      return
    }

    const normalizedDraftSegments = normalizeEnergyPlanDraftSegments(energyPriceModalDraft.segments)
    const hasInvalidSegment = normalizedDraftSegments.some((segment) => parseTimeToMinutes(segment.end) <= parseTimeToMinutes(segment.start))
    if (hasInvalidSegment) {
      openAlertDialog('提示', ENERGY_PRICE_SEGMENT_INVALID_MESSAGE)
      return
    }
    const normalizedSegments = normalizedDraftSegments
      .map((segment, index) => {
        const startMinutes = parseTimeToMinutes(segment.start)
        const endMinutes = parseTimeToMinutes(segment.end)
        if (endMinutes <= startMinutes) return null
        return {
          start: formatMinutesToTime(startMinutes),
          end: formatMinutesToTime(endMinutes),
          price: segment.price ?? '',
          color: segment.color ?? ENERGY_PRICE_SEGMENT_COLORS[index % ENERGY_PRICE_SEGMENT_COLORS.length],
        }
      })
      .filter(Boolean)
    if (normalizedSegments.length === 0) {
      openAlertDialog('提示', ENERGY_PRICE_SEGMENT_INVALID_MESSAGE)
      return
    }
    if (normalizedSegments[0]?.start !== '00:00' || normalizedSegments.at(-1)?.end !== '24:00') {
      openAlertDialog('提示', ENERGY_PRICE_PLAN_TIME_INVALID_MESSAGE)
      return
    }

    const hasEmptyPrice = normalizedSegments.some((segment) => String(segment.price ?? '').trim() === '')
    if (hasEmptyPrice) {
      openAlertDialog('提示', '请填写各时段电价')
      return
    }

    const startMonth = energyPriceModalDraft.startDate ?? '01-01'
    const endMonth = energyPriceModalDraft.endDate ?? '12-31'
    const segmentsPayload = normalizedSegments.map((segment, index) => ({
      energyPriceName: SEGMENT_ENERGY_NAMES[index % SEGMENT_ENERGY_NAMES.length],
      unitPrice: String(segment.price).trim(),
      startTime: segmentUiTimeToApi(segment.start),
      endTime: segmentUiTimeToApi(segment.end),
    }))

    const payload = {
      energyPricePlan: JSON.stringify({
        startMonth,
        endMonth,
        segments: segmentsPayload,
      }),
    }

    if (editingEnergyPlanId != null && editingPlanRangeBeforeEdit != null) {
      const { startDate: prevStart, endDate: prevEnd } = editingPlanRangeBeforeEdit
      if (prevStart !== startMonth || prevEnd !== endMonth) {
        payload.clearStartMonth = prevStart
        payload.clearEndMonth = prevEnd
      }
    }

    setEnergyPricePlanSaving(true)
    try {
      const result = await saveEnergyPricePlan(payload)
      const ok = result?.data?.state === 'success'
      if (!ok) {
        openAlertDialog('提示', result?.data?.message || '保存失败')
        return
      }

      setEnergyPriceState((previous) => {
        const nextPlan = {
          id: editingEnergyPlanId ?? Date.now(),
          startDate: startMonth,
          endDate: endMonth,
          segments: normalizedSegments,
        }
        if (editingEnergyPlanId == null) return { ...previous, electricPlans: [...previous.electricPlans, nextPlan] }
        return { ...previous, electricPlans: previous.electricPlans.map((plan) => (plan.id === editingEnergyPlanId ? nextPlan : plan)) }
      })
      closeEnergyPriceModal()
    } catch (error) {
      openAlertDialog('提示', error?.message || '保存失败，请检查网络')
    } finally {
      setEnergyPricePlanSaving(false)
    }
  }

  const handleDeleteEnergyPlan = () => {
    if (editingEnergyPlanId == null) {
      closeEnergyPriceModal()
      return
    }
    setEnergyPriceState((previous) => ({ ...previous, electricPlans: previous.electricPlans.filter((plan) => plan.id !== editingEnergyPlanId) }))
    closeEnergyPriceModal()
  }

  const rootClass = variant === 'guide' ? 'system-params-detail system-params-detail--guide-energy' : 'system-params-detail'

  return (
    <div className={rootClass}>
      {variant === 'settings' ? settingsHeader : null}

      <div className="energy-price-tabs">
        {ENERGY_PRICE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`energy-price-tab${energyPriceState.tab === tab.value ? ' is-active' : ''}`}
            onClick={() => setEnergyPriceState((previous) => ({ ...previous, tab: tab.value }))}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="energy-price-tip">填写固定价格，峰谷电价格将统一设置为相同的固定值。</p>

      {isWater || isGas ? (
        <button
          type="button"
          className="system-params-field system-params-field--input energy-price-fixed"
          onClick={() => openNumberPad('value', isWater ? 'energy-water' : 'energy-gas')}
        >
          <span>{isWater ? '水固定价格' : '气固定价格'}</span>
          <div className="system-params-input-display">
            <span>{isWater ? energyPriceState.waterFixed : energyPriceState.gasFixed}</span>
            <span className="system-params-input-unit">元/m³</span>
          </div>
        </button>
      ) : null}

      {isElectricity ? (
        <div className="energy-price-electric">
          <button type="button" className="energy-price-add" onClick={() => openEnergyPriceModal()}>
            <img src={addIcon} alt="" aria-hidden="true" />
            <span>新增</span>
          </button>
          {energyPriceState.electricPlans.map((plan) => {
            const bars = plan.segments.map((segment, index) => {
              const start = parseTimeToMinutes(segment.start)
              const end = parseTimeToMinutes(segment.end)
              const duration = Math.max(1, end - start)
              return { key: `${plan.id}-${index}`, start: formatMinutesToTime(start), end: formatMinutesToTime(end), duration, price: segment.price, color: segment.color }
            })
            const totalDuration = bars.reduce((sum, item) => sum + item.duration, 0) || 1
            const boundaries = []
            let passed = 0
            bars.forEach((item, index) => {
              boundaries.push({ key: `${item.key}-start`, time: item.start, left: (passed / totalDuration) * 100 })
              passed += item.duration
              if (index === bars.length - 1) boundaries.push({ key: `${item.key}-end`, time: item.end, left: 100 })
            })
            return (
              <div key={plan.id} className="energy-price-plan">
                <div className="energy-price-plan__head">
                  <span>{`${formatMonthDayText(plan.startDate)} - ${formatMonthDayText(plan.endDate)}`}</span>
                  <button type="button" onClick={() => openEnergyPriceModal(plan)}>
                    <img src={editIcon} alt="" aria-hidden="true" />
                  </button>
                </div>
                <div className="energy-price-plan__times">
                  <div className="energy-price-plan__times-track">
                    {boundaries.map((item) => {
                      const [hh, mm] = item.time.split(':')
                      return (
                        <span key={item.key} className="energy-price-plan__time-marker" style={{ left: `${item.left}%` }}>
                          <span>{hh}</span>
                          <span className="energy-price-plan__time-sep">:</span>
                          <span>{mm}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div className="energy-price-plan__bar">
                  {bars.map((segment) => (
                    <div key={`${segment.key}-bar`} style={{ background: segment.color, flexGrow: segment.duration, flexBasis: 0 }}>
                      {segment.price ? `${segment.price} 元/kWh` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {energyPriceModalOpen ? (
        <div className="energy-price-modal-backdrop" onClick={closeEnergyPriceModal}>
          <div className="energy-price-modal" onClick={(event) => event.stopPropagation()}>
            <div className="energy-price-modal__header">
              <h4>{editingEnergyPlanId == null ? '新增价格' : '编辑价格'}</h4>
              <button type="button" onClick={closeEnergyPriceModal}>
                ×
              </button>
            </div>
            <div className="energy-price-modal__body">
              <section>
                <h5>月份</h5>
                <div className="energy-price-modal__label energy-price-modal__month">
                  <button type="button" onClick={() => setEnergyPricePickerState({ open: true, type: 'startDate', segmentIndex: null })}>
                    <span>开始时间</span>
                    <strong>{formatMonthDayText(energyPriceModalDraft.startDate)}</strong>
                  </button>
                  <button type="button" onClick={() => setEnergyPricePickerState({ open: true, type: 'endDate', segmentIndex: null })}>
                    <span>结束时间</span>
                    <strong>{formatMonthDayText(energyPriceModalDraft.endDate)}</strong>
                  </button>
                </div>
              </section>
              <section>
                <h5>时段价格设置</h5>
                {energyPriceModalDraft.segments.map((segment, index) => (
                  <div key={`modal-segment-${index}`} className="energy-price-modal__row">
                    <button type="button" onClick={() => setEnergyPricePickerState({ open: true, type: 'segment-start', segmentIndex: index })} disabled={index === 0}>
                      {segment.start}
                    </button>
                    <em>-</em>
                    <button type="button" onClick={() => setEnergyPricePickerState({ open: true, type: 'segment-end', segmentIndex: index })}>
                      {segment.end}
                    </button>
                    <button
                      type="button"
                      className={`energy-price-modal__value${segment.price ? '' : ' is-placeholder'}`}
                      onClick={() => openNumberPad(index, 'energy-plan-price')}
                    >
                      {segment.price || '请输入价格'}
                    </button>
                    <button type="button" className="energy-price-modal__remove" onClick={() => handleRemoveEnergyPlanDraftSegment(index)}>
                      删除
                    </button>
                  </div>
                ))}
                <button type="button" className="energy-price-modal__add" onClick={handleAddEnergyPlanDraftSegment} disabled={!canAddEnergyPriceSegment}>
                  新增时段
                </button>
              </section>
            </div>
            <div className="energy-price-modal__actions">
              <button type="button" className="is-danger" onClick={handleDeleteEnergyPlan}>
                删除方案
              </button>
              <button
                type="button"
                className="is-primary"
                disabled={energyPricePlanSaving}
                onClick={() => void handleConfirmEnergyPlanModal()}
              >
                {energyPricePlanSaving ? '保存中…' : '确定'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <NumericKeypadModal
        isOpen={keypadState.open}
        initialValue={
          keypadState.moduleKey === 'energy-water'
            ? energyPriceState.waterFixed
            : keypadState.moduleKey === 'energy-gas'
              ? energyPriceState.gasFixed
              : keypadState.moduleKey === 'energy-plan-price' && Number.isInteger(keypadState.field)
                ? energyPriceModalDraft.segments[keypadState.field]?.price ?? ''
                : ''
        }
        title={
          keypadState.moduleKey === 'energy-water'
            ? '水固定价格'
            : keypadState.moduleKey === 'energy-gas'
              ? '气固定价格'
              : keypadState.moduleKey === 'energy-plan-price'
                ? '时段电价'
                : '输入参数'
        }
        onConfirm={handleKeypadConfirm}
        onClose={() => setKeypadState({ open: false, field: null, moduleKey: null })}
      />

      <TimePickerModal
        isOpen={energyPricePickerState.open}
        title={energyPricePickerState.type === 'startDate' || energyPricePickerState.type === 'endDate' ? '日期选择' : '时间选择'}
        columns={
          energyPricePickerState.type === 'startDate' || energyPricePickerState.type === 'endDate'
            ? [
                { key: 'month', options: DATE_PICKER_MONTHS, formatter: (value) => `${String(value).padStart(2, '0')}月` },
                { key: 'day', options: DATE_PICKER_DAYS, formatter: (value) => `${String(value).padStart(2, '0')}日` },
              ]
            : [
                { key: 'hour', options: TIME_PICKER_HOURS, formatter: (value) => String(value).padStart(2, '0') },
                { key: 'minute', options: TIME_PICKER_MINUTES, formatter: (value) => String(value).padStart(2, '0') },
              ]
        }
        value={energyPricePickerValue}
        onClose={() => setEnergyPricePickerState({ open: false, type: null, segmentIndex: null })}
        onConfirm={handleEnergyPricePickerConfirm}
      />

      <AttentionModal
        isOpen={alertDialog.open}
        title={alertDialog.title || '提示'}
        message={alertDialog.message}
        confirmText="我知道了"
        showCancel={false}
        onClose={closeAlertDialog}
        onConfirm={closeAlertDialog}
      />
    </div>
  )
})

export default SystemParamsEnergyPrice
