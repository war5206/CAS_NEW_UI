import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './GuidePage.css'
import { saveAreaConfig } from '@/api/modules/home'
import { useGuideStore } from '@/features/guide/hooks/useGuideStore'
import { CITY_DATA, PROVINCE_ORDER } from '@/shared/constants/areaData'

const NORMALIZED_CITY_DATA = Object.fromEntries(
  Object.entries(CITY_DATA).map(([province, provinceData]) => {
    const cities = provinceData?.cities || []
    const seen = new Set()
    const deduped = cities.filter((city) => {
      if (seen.has(city.city_name)) return false
      seen.add(city.city_name)
      return true
    })
    return [province, deduped]
  }),
)

const PROVINCE_LIST = PROVINCE_ORDER.filter((province) => CITY_DATA[province]?.cities?.length)

const HOT_CITIES = PROVINCE_ORDER.map((province) => ({
  province,
  city: NORMALIZED_CITY_DATA[province]?.[0]?.city_name || '',
})).filter((item) => !['周口市', '阳泉市', '黔南布依族苗族自治州', '淮南市'].includes(item.city))

/** 热门城市按钮高亮延迟更新，避免快速滑动滚轮时与中间项短暂重合导致按钮闪烁 */
const HOT_CITY_HIGHLIGHT_DEBOUNCE_MS = 220

function clampIndex(index, length) {
  if (length <= 0) return 0
  if (index <= 0) return 0
  if (index >= length - 1) return length - 1
  return index
}

function AreaSelectPage() {
  const navigate = useNavigate()
  const {
    areaSelectedProvince: savedAreaSelectedProvince,
    areaSelectedCity: savedAreaSelectedCity,
    setAreaSelection,
  } = useGuideStore()

  const [selectedProvince, setSelectedProvince] = useState(
    savedAreaSelectedProvince || '江苏省',
  )
  const [selectedCity, setSelectedCity] = useState(savedAreaSelectedCity || '连云港市')
  const [hotCityHighlight, setHotCityHighlight] = useState({
    province: savedAreaSelectedProvince || '江苏省',
    city: savedAreaSelectedCity || '连云港市',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const provinceColumnRef = useRef(null)
  const cityColumnRef = useRef(null)
  const scrollRafRefs = useRef({ province: null, city: null })
  const scrollIdleTimerRefs = useRef({ province: null, city: null })
  const dragStateRef = useRef({
    active: false,
    columnKey: null,
    pointerId: null,
    startY: 0,
    startScrollTop: 0,
    moved: false,
  })
  const suppressNextClickRef = useRef(false)
  const selectedProvinceRef = useRef(selectedProvince)
  selectedProvinceRef.current = selectedProvince

  const currentCityList = useMemo(
    () => NORMALIZED_CITY_DATA[selectedProvince] || [],
    [selectedProvince],
  )

  const selectedCityEntry = useMemo(
    () => currentCityList.find((c) => c.city_name === selectedCity),
    [currentCityList, selectedCity],
  )

  const getRowHeight = useCallback((columnElement) => {
    if (!columnElement) return 110
    const raw = getComputedStyle(columnElement).getPropertyValue('--guide-picker-row-height')
    const parsed = Number.parseFloat(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 110
  }, [])

  useEffect(() => {
    setAreaSelection({
      areaSelectedProvince: selectedProvince,
      areaSelectedCity: selectedCity,
    })
  }, [selectedProvince, selectedCity, setAreaSelection])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setHotCityHighlight((prev) => {
        if (prev.province === selectedProvince && prev.city === selectedCity) return prev
        return { province: selectedProvince, city: selectedCity }
      })
    }, HOT_CITY_HIGHLIGHT_DEBOUNCE_MS)
    return () => clearTimeout(timerId)
  }, [selectedProvince, selectedCity])

  const scrollProvinceToIndex = useCallback(
    (optionIndex, behavior = 'auto') => {
      const el = provinceColumnRef.current
      if (!el || PROVINCE_LIST.length <= 0) return
      const idx = clampIndex(optionIndex, PROVINCE_LIST.length)
      const rowHeight = getRowHeight(el)
      el.scrollTo({ top: idx * rowHeight, behavior })
    },
    [getRowHeight],
  )

  const scrollCityToIndex = useCallback(
    (optionIndex, behavior = 'auto') => {
      const el = cityColumnRef.current
      const len = currentCityList.length
      if (!el || len <= 0) return
      const idx = clampIndex(optionIndex, len)
      const rowHeight = getRowHeight(el)
      el.scrollTo({ top: idx * rowHeight, behavior })
    },
    [currentCityList.length, getRowHeight],
  )

  const handleProvinceScroll = useCallback(() => {
    const columnElement = provinceColumnRef.current
    if (!columnElement || PROVINCE_LIST.length <= 0) return

    const existing = scrollRafRefs.current.province
    if (existing) cancelAnimationFrame(existing)

    scrollRafRefs.current.province = requestAnimationFrame(() => {
      const rowHeight = getRowHeight(columnElement)
      const roughIndex = Math.round(columnElement.scrollTop / rowHeight)
      const nextIndex = clampIndex(roughIndex, PROVINCE_LIST.length)
      const nextProvince = PROVINCE_LIST[nextIndex]
      setSelectedProvince((prev) => (prev === nextProvince ? prev : nextProvince))

      const t = scrollIdleTimerRefs.current.province
      if (t) clearTimeout(t)
      scrollIdleTimerRefs.current.province = setTimeout(() => {
        const targetTop = nextIndex * rowHeight
        if (Math.abs(columnElement.scrollTop - targetTop) > 1) {
          columnElement.scrollTo({ top: targetTop, behavior: 'smooth' })
        }
      }, 100)
    })
  }, [getRowHeight])

  const handleCityScroll = useCallback(() => {
    const columnElement = cityColumnRef.current
    const cities = NORMALIZED_CITY_DATA[selectedProvinceRef.current] || []
    if (!columnElement || cities.length <= 0) return

    const existing = scrollRafRefs.current.city
    if (existing) cancelAnimationFrame(existing)

    scrollRafRefs.current.city = requestAnimationFrame(() => {
      const rowHeight = getRowHeight(columnElement)
      const roughIndex = Math.round(columnElement.scrollTop / rowHeight)
      const nextIndex = clampIndex(roughIndex, cities.length)
      const nextCity = cities[nextIndex]?.city_name
      if (nextCity) {
        setSelectedCity((prev) => (prev === nextCity ? prev : nextCity))
      }

      const t = scrollIdleTimerRefs.current.city
      if (t) clearTimeout(t)
      scrollIdleTimerRefs.current.city = setTimeout(() => {
        const targetTop = nextIndex * rowHeight
        if (Math.abs(columnElement.scrollTop - targetTop) > 1) {
          columnElement.scrollTo({ top: targetTop, behavior: 'smooth' })
        }
      }, 100)
    })
  }, [getRowHeight])

  useEffect(
    () => () => {
      Object.values(scrollRafRefs.current).forEach((id) => {
        if (id) cancelAnimationFrame(id)
      })
      Object.values(scrollIdleTimerRefs.current).forEach((id) => {
        if (id) clearTimeout(id)
      })
    },
    [],
  )

  useLayoutEffect(() => {
    const pi = PROVINCE_LIST.indexOf(selectedProvince)
    const cities = NORMALIZED_CITY_DATA[selectedProvince] || []
    const ci = cities.findIndex((c) => c.city_name === selectedCity)
    requestAnimationFrame(() => {
      if (pi >= 0) scrollProvinceToIndex(pi, 'auto')
      if (ci >= 0) scrollCityToIndex(ci, 'auto')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅首次挂载对齐滚轮位置
  }, [])

  useEffect(() => {
    if (currentCityList.length === 0) return
    const names = currentCityList.map((c) => c.city_name)
    let nextCity = selectedCity
    if (!names.includes(nextCity)) {
      nextCity = currentCityList[0].city_name
      setSelectedCity(nextCity)
    }
    const idx = currentCityList.findIndex((c) => c.city_name === nextCity)
    if (idx < 0) return
    requestAnimationFrame(() => scrollCityToIndex(idx, 'auto'))
  }, [selectedProvince, currentCityList, selectedCity, scrollCityToIndex])

  const handleProvinceOptionClick = (optionIndex) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }
    scrollProvinceToIndex(optionIndex, 'smooth')
  }

  const handleCityOptionClick = (optionIndex) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }
    scrollCityToIndex(optionIndex, 'smooth')
  }

  const handlePointerDown = (columnKey, event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const columnElement = columnKey === 'province' ? provinceColumnRef.current : cityColumnRef.current
    if (!columnElement) return

    dragStateRef.current = {
      active: true,
      columnKey,
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: columnElement.scrollTop,
      moved: false,
    }

    columnElement.classList.add('is-dragging')
    columnElement.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (columnKey, event) => {
    const state = dragStateRef.current
    if (!state.active || state.columnKey !== columnKey || state.pointerId !== event.pointerId) return

    const columnElement = columnKey === 'province' ? provinceColumnRef.current : cityColumnRef.current
    if (!columnElement) return

    const deltaY = event.clientY - state.startY
    if (Math.abs(deltaY) > 3) state.moved = true

    columnElement.scrollTop = state.startScrollTop - deltaY
    event.preventDefault()
  }

  const endPointerDrag = (columnKey, event) => {
    const state = dragStateRef.current
    if (!state.active || state.columnKey !== columnKey) return

    if (event && state.pointerId !== event.pointerId) return

    const columnElement = columnKey === 'province' ? provinceColumnRef.current : cityColumnRef.current
    if (columnElement) {
      if (event?.pointerId != null && columnElement.hasPointerCapture(event.pointerId)) {
        columnElement.releasePointerCapture(event.pointerId)
      }
      columnElement.classList.remove('is-dragging')
    }

    if (state.moved) suppressNextClickRef.current = true

    dragStateRef.current = {
      active: false,
      columnKey: null,
      pointerId: null,
      startY: 0,
      startScrollTop: 0,
      moved: false,
    }
  }

  const handleHotCityClick = (province, city) => {
    setHotCityHighlight({ province, city })
    setSelectedProvince(province)
    setSelectedCity(city)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const pi = PROVINCE_LIST.indexOf(province)
        const cities = NORMALIZED_CITY_DATA[province] || []
        const ci = cities.findIndex((c) => c.city_name === city)
        if (pi >= 0) scrollProvinceToIndex(pi, 'smooth')
        if (ci >= 0) scrollCityToIndex(ci, 'smooth')
      })
    })
  }

  const handleNext = async () => {
    setIsSaving(true)
    setErrorMessage('')

    const projectAreaId = selectedCityEntry?.projectAreaId ?? currentCityList[0]?.projectAreaId
    if (!projectAreaId) {
      setErrorMessage('区域数据异常，请重新选择省市')
      setIsSaving(false)
      return
    }

    try {
      const response = await saveAreaConfig(projectAreaId)

      if (response.data?.state === 'success') {
        navigate('/guide/heat-pump-loop-pump')
        return
      } else {
        setErrorMessage(response.data?.message || '保存失败，请重试')
      }
    } catch (error) {
      console.error('保存区域配置失败:', error)
      setErrorMessage('保存失败，请检查网络连接')
    }
    setIsSaving(false)
  }

  const handleBack = () => {
    navigate('/guide/project-info')
  }

  const provinceSelectedIndex = PROVINCE_LIST.indexOf(selectedProvince)
  const citySelectedIndex = currentCityList.findIndex((c) => c.city_name === selectedCity)

  return (
    <div className="guide-page">
      <div className="guide-page__content guide-page__content--area-select">
        <div className="guide-page__header">
          <h1 className="guide-page__title">区域选择</h1>
          <p className="guide-page__subtitle">根据项目实际所在区域进行选择</p>
        </div>

        <div className="guide-page__area-container">
          <div className="guide-page__hot-cities">
            <h2 className="guide-page__hot-cities-title">热门城市</h2>
            <div className="guide-page__hot-cities-grid">
              {HOT_CITIES.map((item) => (
                <button
                  key={`${item.province}-${item.city}`}
                  type="button"
                  className={`guide-page__city-button ${
                    hotCityHighlight.province === item.province && hotCityHighlight.city === item.city
                      ? 'guide-page__city-button--selected'
                      : ''
                  }`}
                  onClick={() => handleHotCityClick(item.province, item.city)}
                >
                  <span className="guide-page__city-button-text">{item.city}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="guide-page__province-city-selector">
            <div className="guide-page__selector-header-row">
              <div className="guide-page__selector-column-wrap guide-page__selector-column-wrap--label">
                <span className="guide-page__selector-header-text">省份</span>
              </div>
              <div className="guide-page__selector-column-wrap guide-page__selector-column-wrap--label">
                <span className="guide-page__selector-header-text">城市</span>
              </div>
            </div>

            <div className="guide-page__selector-body">
              <div className="guide-page__selector-wheel-track">
                <div className="guide-page__selector-highlight" aria-hidden />
                <div className="guide-page__selector-wrapper guide-page__selector-wrapper--wheel">
                <div className="guide-page__selector-column-wrap">
                  <div
                    ref={provinceColumnRef}
                    className="guide-page__selector-column"
                    onScroll={handleProvinceScroll}
                    onPointerDown={(e) => handlePointerDown('province', e)}
                    onPointerMove={(e) => handlePointerMove('province', e)}
                    onPointerUp={(e) => endPointerDrag('province', e)}
                    onPointerCancel={(e) => endPointerDrag('province', e)}
                    onLostPointerCapture={() => endPointerDrag('province')}
                  >
                    {PROVINCE_LIST.map((province, index) => {
                      const isSelected = index === provinceSelectedIndex
                      return (
                        <button
                          key={province}
                          type="button"
                          className={`guide-page__selector-option guide-page__selector-option--province ${
                            isSelected ? 'is-selected' : ''
                          }`}
                          onClick={() => handleProvinceOptionClick(index)}
                        >
                          {province}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="guide-page__selector-column-wrap">
                  <div
                    key={selectedProvince}
                    ref={cityColumnRef}
                    className="guide-page__selector-column"
                    onScroll={handleCityScroll}
                    onPointerDown={(e) => handlePointerDown('city', e)}
                    onPointerMove={(e) => handlePointerMove('city', e)}
                    onPointerUp={(e) => endPointerDrag('city', e)}
                    onPointerCancel={(e) => endPointerDrag('city', e)}
                    onLostPointerCapture={() => endPointerDrag('city')}
                  >
                    {currentCityList.map((row, index) => {
                      const isSelected = index === citySelectedIndex
                      return (
                        <button
                          key={`${row.city_name}-${row.projectAreaId}`}
                          type="button"
                          className={`guide-page__selector-option ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => handleCityOptionClick(index)}
                        >
                          {row.city_name}
                        </button>
                      )
                    })}
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {errorMessage ? <div className="guide-page__error">{errorMessage}</div> : null}

        <div className="guide-page__button guide-page__button--prev">
          <button type="button" className="guide-page__btn" onClick={handleBack} disabled={isSaving}>
            返回
          </button>
          <button type="button" className="guide-page__btn is-primary" onClick={handleNext} disabled={isSaving}>
            {isSaving ? <span className="guide-loading-inline"><span className="guide-loading-spinner" aria-hidden="true" />保存中</span> : '下一步'}
          </button>
        </div>
      </div>
      {isSaving ? <div className="guide-page__blocking-mask" aria-hidden="true" /> : null}
    </div>
  )
}

export default AreaSelectPage
