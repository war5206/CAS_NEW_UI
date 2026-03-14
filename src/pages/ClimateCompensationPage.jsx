import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import SelectDropdown from '../components/SelectDropdown'
import ToggleSwitch from '../components/ToggleSwitch'
import weatherCompensationIcon from '../assets/home/weather-compensation.svg'
import thermometerIcon from '../assets/thermometer.svg'
import regulationModeIcon from '../assets/regulation-mode.svg'
import gearSettingIcon from '../assets/gear-setting.svg'
import checkMarkIcon from '../assets/icons/check-mark.svg'
import closeIcon from '../assets/icons/close.svg'
import weatherCompensateDividerIcon from '../assets/weather-compensate-divider.svg'
import weatherCompensateCurveIcon from '../assets/weather-compensate-curve.svg'
import { useDeferredVisible } from '../hooks/useDeferredVisible'
import { useActionConfirm } from '../hooks/useActionConfirm'
import { getStoredClimateMode, setStoredClimateMode } from '../utils/climateModeState'
import { getStoredTemperatureMode } from '../utils/temperatureModeState'
import './ClimateCompensationPage.css'

const levelLabels = Array.from({ length: 16 }, (_, index) => String(index + 1))

const trendHours = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`)
const targetReturnData = [24, 24, 24, 24, 24, 24, 26, 28, 30, 32, 34, 34, 32, 30, 28, 26, 24, 24, 24, 24, 24, 24, 24, 24]
const actualSupplyData = [35, 33, 31, 30, 29, 30, 32, 35, 38, 39, 38, 36, 33, 30, 28, 27, 28, 30, 32, 33, 32, 30, 28, 26]
const actualReturnData = [18, 20, 22, 24, 25, 24, 22, 20, 19, 20, 22, 24, 26, 28, 30, 31, 30, 28, 26, 24, 23, 24, 25, 26]

const REGULATION_OPTIONS = [
  {
    value: 'smart',
    label: '智能调节',
    description: '根据环境温度不同自动调节回水目标温度',
  },
  {
    value: 'custom',
    label: '自定义调节',
    description: '按照自定义规则调节回水目标温度',
  },
]

const SMART_ADJUST_OPTIONS = [
  { value: 'auto-calibration', label: '自动校准调节' },
  { value: 'manual', label: '人工调节' },
]

const HEATING_CURVE_X_MIN = -60
const HEATING_CURVE_X_MAX = 19
const COOLING_CURVE_X_MIN = 0
const COOLING_CURVE_X_MAX = 40
const HEATING_CURVE_TEMP_MIN = 20
const HEATING_CURVE_TEMP_MAX = 60
const COOLING_CURVE_TEMP_MIN = 0
const COOLING_CURVE_TEMP_MAX = 40
const CURVE_Y_LABEL_STEP = 5
const CURVE_PAGE_SIZE = 20
const ADVANCED_CURVE_MAX_COUNT = 4
const ADVANCED_CURVE_LABELS = ['曲线一', '曲线二', '曲线三', '曲线四']

function createCurveXAxisList(min, max) {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index)
}

function createInitialCurveValues(tempMin, tempMax, xAxisList) {
  const total = Math.max(1, xAxisList.length - 1)
  return xAxisList.map((_, index) => {
    const ratio = index / total
    const value = tempMax - ratio * (tempMax - tempMin)
    return Math.round(value)
  })
}

function clampCurveTemp(value, tempMin, tempMax) {
  return Math.min(tempMax, Math.max(tempMin, value))
}

function cloneAdvancedCurves(curves) {
  return curves.map((curve) => ({
    ...curve,
    values: [...curve.values],
  }))
}

function clampCurveValueWithNeighbors(values, index, nextValue, tempMin, tempMax) {
  let safeNextValue = clampCurveTemp(nextValue, tempMin, tempMax)

  if (index > 0) {
    safeNextValue = Math.min(safeNextValue, values[index - 1])
  }

  if (index < values.length - 1) {
    safeNextValue = Math.max(safeNextValue, values[index + 1])
  }

  return safeNextValue
}

function ClimateCompensationPage() {
  const { requestConfirm, confirmModal } = useActionConfirm()
  const [selectedMode, setSelectedMode] = useState(() => getStoredClimateMode())
  const [regulateType, setRegulateType] = useState(REGULATION_OPTIONS[0].value)
  const [smartAdjustType, setSmartAdjustType] = useState(SMART_ADJUST_OPTIONS[0].value)
  const [terminalLinked, setTerminalLinked] = useState(true)
  const [indoorTempSetting, setIndoorTempSetting] = useState('10')
  const [levelValue, setLevelValue] = useState(8)
  const [curvePageIndex, setCurvePageIndex] = useState(0)
  const [advancedCurvePageIndex, setAdvancedCurvePageIndex] = useState(0)
  const [temperatureMode] = useState(() => getStoredTemperatureMode())
  const isCoolingTemperatureMode = temperatureMode === 'cooling'
  const curveXAxisMin = isCoolingTemperatureMode ? COOLING_CURVE_X_MIN : HEATING_CURVE_X_MIN
  const curveXAxisMax = isCoolingTemperatureMode ? COOLING_CURVE_X_MAX : HEATING_CURVE_X_MAX
  const curveXAxisList = createCurveXAxisList(curveXAxisMin, curveXAxisMax)
  const curveTempMin = isCoolingTemperatureMode ? COOLING_CURVE_TEMP_MIN : HEATING_CURVE_TEMP_MIN
  const curveTempMax = isCoolingTemperatureMode ? COOLING_CURVE_TEMP_MAX : HEATING_CURVE_TEMP_MAX
  const curveYLabels = Array.from(
    { length: (curveTempMax - curveTempMin) / CURVE_Y_LABEL_STEP + 1 },
    (_, index) => curveTempMax - index * CURVE_Y_LABEL_STEP,
  )
  const curveYGridLineCount = curveYLabels.length - 1
  const [curveValues, setCurveValues] = useState(() => createInitialCurveValues(curveTempMin, curveTempMax, curveXAxisList))
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false)
  const [advancedEnabled, setAdvancedEnabled] = useState(true)
  const [advancedCurves, setAdvancedCurves] = useState([])
  const [activeAdvancedCurveId, setActiveAdvancedCurveId] = useState(null)
  const [nextAdvancedCurveId, setNextAdvancedCurveId] = useState(1)
  const [draftAdvancedEnabled, setDraftAdvancedEnabled] = useState(true)
  const [draftAdvancedCurves, setDraftAdvancedCurves] = useState([])
  const [draftActiveAdvancedCurveId, setDraftActiveAdvancedCurveId] = useState(null)
  const [constantReturnTemp, setConstantReturnTemp] = useState('10')
  const levelSliderStartRef = useRef(8)
  const levelValueRef = useRef(8)
  const isLevelSliderDraggingRef = useRef(false)
  const curveValuesRef = useRef([])
  const curveDragStateRef = useRef({ active: false, index: -1, startValue: null })
  const chartRef = useRef(null)
  const shouldInitChart = useDeferredVisible(chartRef)
  const levelRatio = (levelValue - 1) / (levelLabels.length - 1)
  const isLevelSliderDisabled = regulateType === 'smart' && smartAdjustType === 'auto-calibration'
  const curveTotalPages = Math.ceil(curveXAxisList.length / CURVE_PAGE_SIZE)
  const safeCurvePageIndex = Math.min(curvePageIndex, Math.max(0, curveTotalPages - 1))
  const curveStartIndex = safeCurvePageIndex * CURVE_PAGE_SIZE
  const activeAdvancedCurve = advancedCurves.find((curve) => curve.id === activeAdvancedCurveId) ?? null
  const effectiveCurveValues = advancedEnabled && activeAdvancedCurve ? activeAdvancedCurve.values : curveValues
  const isCurveDragDisabled = regulateType === 'custom' && smartAdjustType === 'auto-calibration'
  const visibleCurveItems = curveXAxisList.slice(curveStartIndex, curveStartIndex + CURVE_PAGE_SIZE).map(
    (outdoorTemp, localIndex) => {
      const index = curveStartIndex + localIndex
      return {
        index,
        outdoorTemp,
        value: effectiveCurveValues[index],
      }
    },
  )
  const activeDraftAdvancedCurve = draftAdvancedCurves.find((curve) => curve.id === draftActiveAdvancedCurveId) ?? null
  const hasDraftAdvancedCurve = Boolean(activeDraftAdvancedCurve)
  const safeAdvancedCurvePageIndex = Math.min(advancedCurvePageIndex, Math.max(0, curveTotalPages - 1))
  const advancedCurveStartIndex = safeAdvancedCurvePageIndex * CURVE_PAGE_SIZE
  const visibleDraftCurveItems = curveXAxisList.slice(advancedCurveStartIndex, advancedCurveStartIndex + CURVE_PAGE_SIZE).map(
    (outdoorTemp, localIndex) => {
      const index = advancedCurveStartIndex + localIndex
      return {
        index,
        outdoorTemp,
        value: activeDraftAdvancedCurve?.values[index] ?? null,
      }
    },
  )

  const updateCurveValue = (index, nextValue) => {
    if (advancedEnabled && activeAdvancedCurve) {
      setAdvancedCurves((previous) =>
        previous.map((curve) => {
          if (curve.id !== activeAdvancedCurve.id) {
            return curve
          }

          const safeNextValue = clampCurveValueWithNeighbors(curve.values, index, nextValue, curveTempMin, curveTempMax)
          if (curve.values[index] === safeNextValue) {
            return curve
          }

          const nextValues = [...curve.values]
          nextValues[index] = safeNextValue
          return {
            ...curve,
            values: nextValues,
          }
        }),
      )
      return
    }

    setCurveValues((prev) => {
      const safeNextValue = clampCurveValueWithNeighbors(prev, index, nextValue, curveTempMin, curveTempMax)
      if (prev[index] === safeNextValue) {
        return prev
      }

      const next = [...prev]
      next[index] = safeNextValue
      return next
    })
  }

  const resolveCurveValueByPointer = (clientY, rect) => {
    const ratio = (clientY - rect.top) / rect.height
    const clampedRatio = Math.min(1, Math.max(0, ratio))
    const mapped = curveTempMax - clampedRatio * (curveTempMax - curveTempMin)
    return Math.round(mapped)
  }

  const handleCurveBarPointerDown = (index) => (event) => {
    if (isCurveDragDisabled) {
      return
    }

    if (event.button !== 0) {
      return
    }

    const dragArea = event.currentTarget
    const rect = dragArea.getBoundingClientRect()
    curveDragStateRef.current = {
      active: true,
      index,
      startValue: effectiveCurveValues[index],
    }
    const updateByClientY = (clientY) => {
      updateCurveValue(index, resolveCurveValueByPointer(clientY, rect))
    }

    updateByClientY(event.clientY)

    if (!dragArea.setPointerCapture) {
      return
    }

    dragArea.setPointerCapture(event.pointerId)
    const handlePointerMove = (moveEvent) => {
      updateByClientY(moveEvent.clientY)
    }

    const handlePointerEnd = () => {
      if (dragArea.hasPointerCapture?.(event.pointerId)) {
        dragArea.releasePointerCapture(event.pointerId)
      }
      dragArea.removeEventListener('pointermove', handlePointerMove)
      dragArea.removeEventListener('pointerup', handlePointerEnd)
      dragArea.removeEventListener('pointercancel', handlePointerEnd)

      const dragState = curveDragStateRef.current
      curveDragStateRef.current = { active: false, index: -1, startValue: null }

      if (!dragState.active || dragState.index !== index) {
        return
      }

      const nextValue = advancedEnabled && activeAdvancedCurve ? activeAdvancedCurve.values[index] : curveValuesRef.current[index]
      if (dragState.startValue === nextValue) {
        return
      }

      requestConfirm(
        { message: `确认将环境温度 ${curveXAxisList[index]}℃ 对应的目标温度设置为 ${nextValue}℃吗？` },
        () => {},
        () => {
          if (advancedEnabled && activeAdvancedCurve) {
            setAdvancedCurves((previous) =>
              previous.map((curve) => {
                if (curve.id !== activeAdvancedCurve.id) {
                  return curve
                }

                const nextValues = [...curve.values]
                nextValues[index] = dragState.startValue
                return {
                  ...curve,
                  values: nextValues,
                }
              }),
            )
            return
          }

          setCurveValues((previous) => {
            const next = [...previous]
            next[index] = dragState.startValue
            return next
          })
        },
      )
    }

    dragArea.addEventListener('pointermove', handlePointerMove)
    dragArea.addEventListener('pointerup', handlePointerEnd)
    dragArea.addEventListener('pointercancel', handlePointerEnd)
  }

  const updateDraftCurveValue = (index, nextValue) => {
    if (!activeDraftAdvancedCurve) {
      return
    }

    setDraftAdvancedCurves((previous) =>
      previous.map((curve) => {
        if (curve.id !== activeDraftAdvancedCurve.id) {
          return curve
        }

        const safeNextValue = clampCurveValueWithNeighbors(curve.values, index, nextValue, curveTempMin, curveTempMax)
        if (curve.values[index] === safeNextValue) {
          return curve
        }

        const nextValues = [...curve.values]
        nextValues[index] = safeNextValue
        return {
          ...curve,
          values: nextValues,
        }
      }),
    )
  }

  const handleAdvancedCurveBarPointerDown = (index) => (event) => {
    if (!draftAdvancedEnabled || !activeDraftAdvancedCurve) {
      return
    }

    if (event.button !== 0) {
      return
    }

    const dragArea = event.currentTarget
    const rect = dragArea.getBoundingClientRect()
    const updateByClientY = (clientY) => {
      updateDraftCurveValue(index, resolveCurveValueByPointer(clientY, rect))
    }

    updateByClientY(event.clientY)

    if (!dragArea.setPointerCapture) {
      return
    }

    dragArea.setPointerCapture(event.pointerId)
    const handlePointerMove = (moveEvent) => {
      updateByClientY(moveEvent.clientY)
    }

    const handlePointerEnd = () => {
      if (dragArea.hasPointerCapture?.(event.pointerId)) {
        dragArea.releasePointerCapture(event.pointerId)
      }
      dragArea.removeEventListener('pointermove', handlePointerMove)
      dragArea.removeEventListener('pointerup', handlePointerEnd)
      dragArea.removeEventListener('pointercancel', handlePointerEnd)
    }

    dragArea.addEventListener('pointermove', handlePointerMove)
    dragArea.addEventListener('pointerup', handlePointerEnd)
    dragArea.addEventListener('pointercancel', handlePointerEnd)
  }

  const openAdvancedModal = () => {
    const fallbackActiveId = activeAdvancedCurveId ?? advancedCurves[0]?.id ?? null
    setDraftAdvancedEnabled(advancedEnabled)
    setDraftAdvancedCurves(cloneAdvancedCurves(advancedCurves))
    setDraftActiveAdvancedCurveId(fallbackActiveId)
    setAdvancedCurvePageIndex(0)
    setIsAdvancedModalOpen(true)
  }

  const closeAdvancedModal = () => {
    setIsAdvancedModalOpen(false)
  }

  const handleAddAdvancedCurve = () => {
    if (draftAdvancedCurves.length >= ADVANCED_CURVE_MAX_COUNT) {
      return
    }

    const nextCurve = {
      id: nextAdvancedCurveId,
      values: curveXAxisList.map(() => curveTempMin),
    }

    setNextAdvancedCurveId((previous) => previous + 1)
    setDraftAdvancedCurves((previous) => [...previous, nextCurve])
    setDraftActiveAdvancedCurveId(nextCurve.id)
  }

  const handleDeleteAdvancedCurve = () => {
    if (!activeDraftAdvancedCurve) {
      return
    }

    const currentIndex = draftAdvancedCurves.findIndex((curve) => curve.id === activeDraftAdvancedCurve.id)
    const nextCurves = draftAdvancedCurves.filter((curve) => curve.id !== activeDraftAdvancedCurve.id)
    const nextActiveId =
      nextCurves[currentIndex]?.id ??
      nextCurves[currentIndex - 1]?.id ??
      null

    setDraftAdvancedCurves(nextCurves)
    setDraftActiveAdvancedCurveId(nextActiveId)
    setAdvancedCurvePageIndex(0)
  }

  const commitAdvancedCurve = () => {
    const nextCurves = cloneAdvancedCurves(draftAdvancedCurves)
    const fallbackActiveId = draftActiveAdvancedCurveId ?? nextCurves[0]?.id ?? null

    setAdvancedEnabled(draftAdvancedEnabled)
    setAdvancedCurves(nextCurves)
    setActiveAdvancedCurveId(fallbackActiveId)

    setIsAdvancedModalOpen(false)
  }

  const handleConfirmAdvancedCurve = () => {
    requestConfirm(
      { message: '确认应用当前高级调节设置吗？' },
      commitAdvancedCurve,
    )
  }

  useEffect(() => {
    setStoredClimateMode(selectedMode)
  }, [selectedMode])

  useEffect(() => {
    if (!isAdvancedModalOpen) {
      return undefined
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeAdvancedModal()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isAdvancedModalOpen])

  useEffect(() => {
    curveValuesRef.current = curveValues
  }, [curveValues])

  useEffect(() => {
    levelValueRef.current = levelValue
  }, [levelValue])

  const handleLevelSliderPointerDown = () => {
    isLevelSliderDraggingRef.current = true
    levelSliderStartRef.current = levelValue
  }

  const handleLevelSliderPointerEnd = () => {
    if (!isLevelSliderDraggingRef.current) {
      return
    }

    isLevelSliderDraggingRef.current = false
    const previousValue = levelSliderStartRef.current
    const nextValue = levelValueRef.current

    if (previousValue === nextValue) {
      return
    }

    requestConfirm(
      { message: `确认将温度档位设定为 ${nextValue} 档吗？` },
      () => {},
      () => setLevelValue(previousValue),
    )
  }

  useEffect(() => {
    const handlePointerRelease = () => {
      handleLevelSliderPointerEnd()
    }

    window.addEventListener('pointerup', handlePointerRelease)
    window.addEventListener('pointercancel', handlePointerRelease)

    return () => {
      window.removeEventListener('pointerup', handlePointerRelease)
      window.removeEventListener('pointercancel', handlePointerRelease)
    }
  }, [requestConfirm, levelValue])

  useEffect(() => {
    if (selectedMode !== 'climate' || regulateType === 'custom' || !shouldInitChart || !chartRef.current) {
      return undefined
    }

    const existingChart = echarts.getInstanceByDom(chartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(chartRef.current)
    chart.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(29, 38, 54, 0.96)',
        borderWidth: 1,
        borderColor: 'rgba(120, 155, 203, 0.45)',
        textStyle: { color: '#eaf4ff', fontSize: 14 },
      },
      grid: { top: 52, left: 62, right: 26, bottom: 66 },
      xAxis: {
        type: 'category',
        data: trendHours,
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(201, 216, 237, 0.35)' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#8f9cad',
          fontSize: 16,
          interval: 1,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 50,
        interval: 10,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: '#8f9cad',
          fontSize: 18,
          formatter: '{value}℃',
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: 'rgba(176, 195, 220, 0.46)',
          },
        },
      },
      legend: {
        bottom: 0,
        itemWidth: 18,
        itemHeight: 10,
        textStyle: {
          color: '#e2edf9',
          fontSize: 18,
        },
      },
      series: [
        {
          name: '目标回水温度',
          color: '#1EF09A',
          type: 'line',
          data: targetReturnData,
          smooth: false,
          step: 'middle',
          lineStyle: { color: '#1EF09A', width: 3, type: 'dashed' },
          symbol: 'none',
        },
        {
          name: '实际供水温度',
          color: '#FF5A2D',
          type: 'line',
          data: actualSupplyData,
          smooth: true,
          lineStyle: { color: '#FF5A2D', width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255, 90, 45, 0.26)' },
              { offset: 1, color: 'rgba(255, 90, 45, 0)' },
            ]),
          },
          itemStyle: { color: '#ff5a2d' },
        },
        {
          name: '实际回水温度',
          color: '#F6C939',
          type: 'line',
          data: actualReturnData,
          smooth: true,
          lineStyle: { color: '#F6C939', width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(246, 201, 57, 0.22)' },
              { offset: 1, color: 'rgba(246, 201, 57, 0)' },
            ]),
          },
          itemStyle: { color: '#f6c939' },
        },
      ],
    })

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(chartRef.current)
    const frameId = window.requestAnimationFrame(() => chart.resize())

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [selectedMode, regulateType, shouldInitChart])

  return (
    <>
    <main className="climate-page">
      <section className="climate-page__mode-grid">
        <FeatureInfoCard
          icon={weatherCompensationIcon}
          title="气候补偿"
          description="根据环境温度不同自动调节回水目标温度"
          selected={selectedMode === 'climate'}
          selectedBadgePosition="start"
          onClick={() => setSelectedMode('climate')}
          className="climate-page__mode-card"
          confirmConfig={selectedMode === 'climate' ? null : { message: '确认切换为气候补偿模式吗？' }}
        />
        <FeatureInfoCard
          icon={thermometerIcon}
          title="定温模式"
          description="固定温度运行"
          selected={selectedMode === 'constant'}
          onClick={() => setSelectedMode('constant')}
          className="climate-page__mode-card"
          confirmConfig={selectedMode === 'constant' ? null : { message: '确认切换为定温模式吗？' }}
        />
      </section>

      {selectedMode === 'climate' ? (
        <>
          <section className="climate-page__system-setting">
            <h2 className="climate-page__system-setting-title">系统设置</h2>
          </section>

          <section className="climate-page__panel climate-page__panel--regulation">
            <div className="climate-page__panel-title-wrap climate-page__panel-title-wrap--setting">
              <img src={regulationModeIcon} alt="" aria-hidden="true" />
              <h3 className="climate-page__panel-title">调节模式</h3>
              <SelectDropdown
                className="climate-page__regulation-select"
                triggerClassName="climate-page__regulation-select-trigger"
                dropdownClassName="climate-page__regulation-select-dropdown"
                optionClassName="climate-page__regulation-select-option"
                options={REGULATION_OPTIONS.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
                value={regulateType}
                onChange={setRegulateType}
                confirmConfig={({ nextValue }) => {
                  const nextOption = REGULATION_OPTIONS.find((item) => item.value === nextValue)
                  return nextOption ? { message: `确认切换为${nextOption.label}吗？` } : null
                }}
                showSelectedCheck
                selectedCheckIcon={checkMarkIcon}
                triggerAriaLabel="选择调节模式"
                listAriaLabel="调节模式列表"
              />
            </div>

            <div className="climate-page__rows">
              <div className="climate-page__row">
                <div>
                  <div className="climate-page__row-title">智能调节</div>
                  <div className="climate-page__row-desc">根据环境温度不同自动调节回水目标温度</div>
                </div>
                <SelectDropdown
                  className="climate-page__regulation-select climate-page__smart-adjust-select"
                  triggerClassName="climate-page__regulation-select-trigger"
                  dropdownClassName="climate-page__regulation-select-dropdown"
                  optionClassName="climate-page__regulation-select-option"
                  options={SMART_ADJUST_OPTIONS}
                  value={smartAdjustType}
                  onChange={setSmartAdjustType}
                  confirmConfig={({ nextValue }) => {
                    const nextOption = SMART_ADJUST_OPTIONS.find((item) => item.value === nextValue)
                    return nextOption ? { message: `确认切换为${nextOption.label}吗？` } : null
                  }}
                  showSelectedCheck
                  selectedCheckIcon={checkMarkIcon}
                  triggerAriaLabel="选择智能调节方式"
                  listAriaLabel="智能调节方式列表"
                />
              </div>
              <div className="climate-page__row-divider" aria-hidden="true">
                <img src={weatherCompensateDividerIcon} alt="" />
              </div>
              <div className="climate-page__row climate-page__row--switch">
                <div>
                  <div className="climate-page__row-title">末端联调</div>
                  <div className="climate-page__row-desc">功能开启时，自动校准调节生效</div>
                </div>
                <ToggleSwitch
                  checked={terminalLinked}
                  onToggle={() => setTerminalLinked((prev) => !prev)}
                  className="climate-page__terminal-switch"
                  ariaLabel={`末端联调${terminalLinked ? '关闭' : '开启'}`}
                  confirmConfig={({ nextChecked }) => ({
                    message: `确认${nextChecked ? '开启' : '关闭'}末端联调吗？`,
                  })}
                />
              </div>
            </div>
          </section>

          {terminalLinked ? (
            <section className="climate-page__panel climate-page__panel--indoor-temp">
              <LabeledSelectRow
                label="室内温度设定"
                value={indoorTempSetting}
                onChange={setIndoorTempSetting}
                suffix="℃"
                className="climate-page__indoor-temp-setting"
                confirmConfig={({ nextValue }) => ({ message: `确认将室内温度设定为 ${nextValue} ℃吗？` })}
              />
            </section>
          ) : null}

          {regulateType === 'custom' ? (
            <section className="climate-page__panel climate-page__panel--curve">
              <div className="climate-page__curve-header">
                <div className="climate-page__curve-title-wrap">
                  <img src={weatherCompensateCurveIcon} alt="" aria-hidden="true" />
                  <h3 className="climate-page__panel-title">气候补偿曲线</h3>
                </div>
                <div className="climate-page__curve-actions">
                  <button type="button" className="climate-page__curve-action-btn" onClick={openAdvancedModal}>高级调节</button>
                </div>
              </div>

              <div className="climate-page__curve-y-title">目标温度℃</div>

                <div className={`climate-page__curve-board${isCoolingTemperatureMode ? ' is-cooling' : ''}`}>
                  <div className="climate-page__curve-y-axis">
                    {curveYLabels.map((label, index) => (
                      <span
                        key={label}
                        style={{ '--curve-label-ratio': index / (curveYLabels.length - 1) }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>

                <div className="climate-page__curve-plot" style={{ '--curve-grid-line-count': curveYGridLineCount }}>
                  {isCurveDragDisabled ? <div className="climate-page__curve-mask" aria-hidden="true" /> : null}
                  <div className="climate-page__curve-grid" aria-hidden="true" />
                  <div className="climate-page__curve-columns">
                    {visibleCurveItems.map((item) => (
                      <div key={item.outdoorTemp} className="climate-page__curve-column">
                        <div
                          className={`climate-page__curve-bar-area${isCurveDragDisabled ? ' is-disabled' : ''}`}
                          onPointerDown={handleCurveBarPointerDown(item.index)}
                          role="slider"
                          aria-label={`${item.outdoorTemp}℃室外温度对应目标温度`}
                          aria-valuemin={curveTempMin}
                          aria-valuemax={curveTempMax}
                          aria-valuenow={item.value}
                          aria-disabled={isCurveDragDisabled}
                        >
                          <div
                            className="climate-page__curve-bar"
                            style={{
                              '--bar-height': `${((item.value - curveTempMin) / (curveTempMax - curveTempMin)) * 100}%`,
                            }}
                          >
                            <span className="climate-page__curve-bar-value">{item.value}</span>
                          </div>
                        </div>
                        <span className="climate-page__curve-x-label">{item.outdoorTemp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="climate-page__curve-x-title">环境温度℃</div>

              <div className="climate-page__curve-pagination">
                <button
                  type="button"
                  className="climate-page__curve-page-btn"
                  onClick={() => setCurvePageIndex((prev) => Math.max(0, prev - 1))}
                  disabled={safeCurvePageIndex === 0}
                >
                  上一页
                </button>
                <button
                  type="button"
                  className="climate-page__curve-page-btn"
                  onClick={() => setCurvePageIndex((prev) => Math.min(curveTotalPages - 1, prev + 1))}
                  disabled={safeCurvePageIndex === curveTotalPages - 1}
                >
                  下一页
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="climate-page__panel climate-page__panel--gear-setting">
                <div className="climate-page__panel-title-wrap climate-page__panel-title-wrap--setting">
                  <img src={gearSettingIcon} alt="" aria-hidden="true" />
                  <h3 className="climate-page__panel-title">温度档位设定</h3>
                </div>

                <div className="climate-page__level-control">
                  <div className="climate-page__level-scale-wrap">
                    <div className="climate-page__level-scale">
                      {levelLabels.map((label, index) => (
                        <span
                          key={label}
                          style={{ '--label-ratio': index / (levelLabels.length - 1) }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <span className="climate-page__level-unit">档</span>
                  </div>

                  <div
                    className={`climate-page__level-slider-wrap${isLevelSliderDisabled ? ' is-disabled' : ''}`}
                    style={{ '--ratio': levelRatio }}
                  >
                    <div className="climate-page__level-slider-track" aria-hidden="true" />
                    <input
                      type="range"
                      min={1}
                      max={16}
                      step={1}
                      value={levelValue}
                      onChange={(event) => setLevelValue(Number(event.target.value))}
                      onPointerDown={handleLevelSliderPointerDown}
                      onPointerUp={handleLevelSliderPointerEnd}
                      onPointerCancel={handleLevelSliderPointerEnd}
                      className="climate-page__level-slider-input"
                      disabled={isLevelSliderDisabled}
                    />
                    <div className="climate-page__level-slider-thumb" aria-hidden="true" />
                  </div>
                </div>
              </section>

              <section className="climate-page__panel climate-page__panel--chart">
                <h3 className="climate-page__panel-title climate-page__panel-title--muted">温度档位设定和变化规律</h3>
                <div className="climate-page__metrics">
                  <article className="climate-page__metric">
                    <span>室外温度 (℃)</span>
                    <strong>-10</strong>
                  </article>
                  <article className="climate-page__metric">
                    <span>室外温度 (℃)</span>
                    <strong>-10</strong>
                  </article>
                </div>
                <div ref={chartRef} className="climate-page__chart" />
              </section>
            </>
          )}
        </>
      ) : (
        <section className="climate-page__constant-section">
          <h3 className="climate-page__constant-title">参数设置</h3>
          <LabeledSelectRow
            label="回水温度设定"
            value={constantReturnTemp}
            onChange={setConstantReturnTemp}
            suffix="℃"
            className="climate-page__constant-row"
            confirmConfig={({ nextValue }) => ({ message: `确认将回水温度设定为 ${nextValue} ℃吗？` })}
          />
        </section>
      )}
    </main>
    {isAdvancedModalOpen ? (
      <div className="climate-page__advanced-modal-backdrop" role="presentation" onClick={closeAdvancedModal}>
        <section
          className={`climate-page__advanced-modal${isCoolingTemperatureMode ? ' is-cooling' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="高级调节"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="climate-page__advanced-modal-header">
            <h3 className="climate-page__advanced-modal-title">高级调节</h3>
            <button type="button" className="climate-page__advanced-modal-close" aria-label="关闭" onClick={closeAdvancedModal}>
              <img src={closeIcon} alt="" aria-hidden="true" />
            </button>
          </header>

          <div className="climate-page__advanced-modal-body">
            <div className="climate-page__advanced-switch-row">
              <span>高级调节</span>
              <ToggleSwitch
                checked={draftAdvancedEnabled}
                onToggle={() => setDraftAdvancedEnabled((previous) => !previous)}
                className="climate-page__advanced-switch"
                ariaLabel={`高级调节${draftAdvancedEnabled ? '关闭' : '开启'}`}
              />
            </div>

            <div className={`climate-page__advanced-editor${!draftAdvancedEnabled ? ' is-disabled' : ''}`}>
              <div className="climate-page__advanced-tabs-row">
                <div className="climate-page__advanced-tabs">
                  {draftAdvancedCurves.length > 0 ? (
                    draftAdvancedCurves.map((curve, index) => (
                      <button
                        key={curve.id}
                        type="button"
                        className={`climate-page__advanced-tab${curve.id === draftActiveAdvancedCurveId ? ' is-active' : ''}`}
                        onClick={() => setDraftActiveAdvancedCurveId(curve.id)}
                        disabled={!draftAdvancedEnabled}
                      >
                        {ADVANCED_CURVE_LABELS[index] ?? `曲线${index + 1}`}
                      </button>
                    ))
                  ) : (
                    <button type="button" className="climate-page__advanced-tab is-empty" disabled>
                      空
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="climate-page__advanced-add-btn"
                  onClick={handleAddAdvancedCurve}
                  disabled={!draftAdvancedEnabled || draftAdvancedCurves.length >= ADVANCED_CURVE_MAX_COUNT}
                >
                  <span className="climate-page__advanced-add-icon" aria-hidden="true">+</span>
                  新增
                </button>
              </div>

              <div className="climate-page__curve-y-title">目标温度℃</div>

              <div className={`climate-page__curve-board climate-page__curve-board--advanced${isCoolingTemperatureMode ? ' is-cooling' : ''}`}>
                <div className="climate-page__curve-y-axis">
                  {curveYLabels.map((label, index) => (
                    <span
                      key={`advanced-${label}`}
                      style={{ '--curve-label-ratio': index / (curveYLabels.length - 1) }}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                <div className="climate-page__curve-plot" style={{ '--curve-grid-line-count': curveYGridLineCount }}>
                  <div className="climate-page__curve-grid" aria-hidden="true" />
                  {!draftAdvancedEnabled ? <div className="climate-page__curve-mask" aria-hidden="true" /> : null}
                  <div className="climate-page__curve-columns">
                    {visibleDraftCurveItems.map((item) => (
                      <div key={`advanced-${item.outdoorTemp}`} className="climate-page__curve-column">
                        <div
                          className={`climate-page__curve-bar-area${!draftAdvancedEnabled || !hasDraftAdvancedCurve ? ' is-disabled' : ''}`}
                          onPointerDown={handleAdvancedCurveBarPointerDown(item.index)}
                          role="slider"
                          aria-label={`${item.outdoorTemp}℃室外温度对应目标温度`}
                          aria-valuemin={curveTempMin}
                          aria-valuemax={curveTempMax}
                          aria-valuenow={item.value ?? curveTempMin}
                          aria-disabled={!draftAdvancedEnabled || !hasDraftAdvancedCurve}
                        >
                          {item.value != null ? (
                            <div
                              className="climate-page__curve-bar"
                              style={{
                                '--bar-height': `${((item.value - curveTempMin) / (curveTempMax - curveTempMin)) * 100}%`,
                              }}
                            >
                              <span className="climate-page__curve-bar-value">{item.value}</span>
                            </div>
                          ) : null}
                        </div>
                        <span className="climate-page__curve-x-label">{item.outdoorTemp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="climate-page__curve-x-title">环境温度℃</div>
              <div className="climate-page__curve-pagination climate-page__curve-pagination--advanced">
                <button
                  type="button"
                  className="climate-page__curve-page-btn"
                  onClick={() => setAdvancedCurvePageIndex((prev) => Math.max(0, prev - 1))}
                  disabled={safeAdvancedCurvePageIndex === 0}
                >
                  上一页
                </button>
                <button
                  type="button"
                  className="climate-page__curve-page-btn"
                  onClick={() => setAdvancedCurvePageIndex((prev) => Math.min(curveTotalPages - 1, prev + 1))}
                  disabled={safeAdvancedCurvePageIndex === curveTotalPages - 1}
                >
                  下一页
                </button>
              </div>
            </div>

            {hasDraftAdvancedCurve ? (
              <div className="climate-page__advanced-actions">
                <button
                  type="button"
                  className="climate-page__advanced-action-btn is-delete"
                  onClick={handleDeleteAdvancedCurve}
                >
                  删除曲线
                </button>
                <button
                  type="button"
                  className="climate-page__advanced-action-btn is-confirm"
                  onClick={handleConfirmAdvancedCurve}
                >
                  确定
                </button>
              </div>
            ) : (
              <div className="climate-page__advanced-actions climate-page__advanced-actions--single">
                <button
                  type="button"
                  className="climate-page__advanced-action-btn is-cancel"
                  onClick={closeAdvancedModal}
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    ) : null}
    {confirmModal}
    </>
  )
}

export default ClimateCompensationPage
