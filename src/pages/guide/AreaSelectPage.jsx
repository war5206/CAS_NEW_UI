import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './GuidePage.css'
import { saveAreaConfig } from '@/api/modules/home'
import { useGuideStore } from '@/features/guide/hooks/useGuideStore'

// 省份城市数据（与产品文档一致；projectAreaId 可先统一为 "1"）
const RAW_CITY_DATA = {
  北京市: ['北京市'],
  天津市: ['天津市'],
  上海市: ['上海市'],
  重庆市: ['重庆市'],
  河北省: ['石家庄市', '唐山市', '秦皇岛市', '邯郸市', '邢台市', '保定市', '张家口市', '承德市', '沧州市', '廊坊市', '衡水市'],
  山西省: ['太原市', '大同市', '阳泉市', '长治市', '晋城市', '朔州市', '晋中市', '运城市', '忻州市', '临汾市', '吕梁市'],
  辽宁省: ['沈阳市', '大连市', '鞍山市', '抚顺市', '本溪市', '丹东市', '锦州市', '营口市', '阜新市', '辽阳市', '盘锦市', '铁岭市', '朝阳市', '葫芦岛市'],
  吉林省: ['长春市', '吉林市', '四平市', '辽源市', '通化市', '白山市', '松原市', '白城市', '延边朝鲜族自治州'],
  黑龙江省: ['哈尔滨市', '齐齐哈尔市', '鸡西市', '鹤岗市', '双鸭山市', '大庆市', '伊春市', '佳木斯市', '七台河市', '牡丹江市', '黑河市', '绥化市', '大兴安岭地区'],
  江苏省: ['南京市', '无锡市', '徐州市', '常州市', '苏州市', '南通市', '连云港市', '淮安市', '盐城市', '扬州市', '镇江市', '泰州市', '宿迁市'],
  浙江省: ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '衢州市', '舟山市', '台州市', '丽水市'],
  安徽省: ['合肥市', '芜湖市', '蚌埠市', '淮南市', '马鞍山市', '淮北市', '铜陵市', '安庆市', '黄山市', '滁州市', '阜阳市', '宿州市', '六安市', '亳州市', '池州市', '宣城市'],
  福建省: ['福州市', '厦门市', '莆田市', '三明市', '泉州市', '漳州市', '南平市', '龙岩市', '宁德市'],
  江西省: ['南昌市', '景德镇市', '萍乡市', '九江市', '新余市', '鹰潭市', '赣州市', '吉安市', '宜春市', '抚州市', '上饶市'],
  山东省: ['济南市', '青岛市', '淄博市', '枣庄市', '东营市', '烟台市', '潍坊市', '济宁市', '泰安市', '威海市', '日照市', '临沂市', '德州市', '聊城市', '滨州市', '菏泽市'],
  河南省: ['郑州市', '开封市', '洛阳市', '平顶山市', '安阳市', '鹤壁市', '新乡市', '焦作市', '濮阳市', '许昌市', '漯河市', '三门峡市', '南阳市', '商丘市', '信阳市', '周口市', '驻马店市', '济源市'],
  湖北省: ['武汉市', '黄石市', '十堰市', '宜昌市', '襄阳市', '鄂州市', '荆门市', '孝感市', '荆州市', '黄冈市', '咸宁市', '随州市', '恩施土家族苗族自治州'],
  湖南省: ['长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市', '岳阳市', '常德市', '张家界市', '益阳市', '郴州市', '永州市', '怀化市', '娄底市', '湘西土家族苗族自治州'],
  广东省: ['广州市', '深圳市', '珠海市', '汕头市', '佛山市', '韶关市', '湛江市', '肇庆市', '江门市', '茂名市', '惠州市', '梅州市', '汕尾市', '河源市', '阳江市', '清远市', '东莞市', '中山市', '潮州市', '揭阳市', '云浮市'],
  海南省: ['海口市', '三亚市', '三沙市', '儋州市'],
  四川省: ['成都市', '自贡市', '攀枝花市', '泸州市', '德阳市', '绵阳市', '广元市', '遂宁市', '内江市', '乐山市', '南充市', '眉山市', '宜宾市', '广安市', '达州市', '雅安市', '巴中市', '资阳市', '阿坝藏族羌族自治州', '甘孜藏族自治州', '凉山彝族自治州'],
  贵州省: ['贵阳市', '六盘水市', '遵义市', '安顺市', '毕节市', '铜仁市', '黔西南布依族苗族自治州', '黔东南苗族侗族自治州', '黔南布依族苗族自治州'],
  云南省: ['昆明市', '曲靖市', '玉溪市', '保山市', '昭通市', '丽江市', '普洱市', '临沧市', '楚雄彝族自治州', '红河哈尼族彝族自治州', '文山壮族苗族自治州', '西双版纳傣族自治州', '大理白族自治州', '德宏傣族景颇族自治州', '怒江傈僳族自治州', '迪庆藏族自治州'],
  陕西省: ['西安市', '铜川市', '宝鸡市', '咸阳市', '渭南市', '延安市', '汉中市', '榆林市', '安康市', '商洛市'],
  甘肃省: ['兰州市', '嘉峪关市', '金昌市', '白银市', '天水市', '武威市', '张掖市', '平凉市', '酒泉市', '庆阳市', '定西市', '陇南市', '临夏回族自治州', '甘南藏族自治州'],
  青海省: ['西宁市', '海东市', '海北藏族自治州', '黄南藏族自治州', '海南藏族自治州', '果洛藏族自治州', '玉树藏族自治州', '海西蒙古族藏族自治州'],
  内蒙古自治区: ['呼和浩特市', '包头市', '乌海市', '赤峰市', '通辽市', '鄂尔多斯市', '呼伦贝尔市', '巴彦淖尔市', '乌兰察布市', '兴安盟', '锡林郭勒盟', '阿拉善盟'],
  广西壮族自治区: ['南宁市', '柳州市', '桂林市', '梧州市', '北海市', '防城港市', '钦州市', '贵港市', '玉林市', '百色市', '贺州市', '河池市', '来宾市', '崇左市'],
  西藏自治区: ['拉萨市', '日喀则市', '昌都市', '林芝市', '山南市', '那曲市', '阿里地区'],
  宁夏回族自治区: ['银川市', '石嘴山市', '吴忠市', '固原市', '中卫市'],
  新疆维吾尔自治区: ['乌鲁木齐市', '克拉玛依市', '吐鲁番市', '哈密市', '昌吉回族自治州', '博尔塔拉蒙古自治州', '巴音郭楞蒙古自治州', '阿克苏地区', '克孜勒苏柯尔克孜自治州', '喀什地区', '和田地区', '伊犁哈萨克自治州', '塔城地区', '阿勒泰地区'],
}

const CITY_DATA = {}
Object.keys(RAW_CITY_DATA).forEach((province) => {
  CITY_DATA[province] = RAW_CITY_DATA[province].map((cityName) => ({
    city_name: cityName,
    projectAreaId: '1',
  }))
})

const PROVINCE_ORDER = [
  '北京市',
  '天津市',
  '上海市',
  '重庆市',
  '河北省',
  '山西省',
  '辽宁省',
  '吉林省',
  '黑龙江省',
  '江苏省',
  '浙江省',
  '安徽省',
  '福建省',
  '江西省',
  '山东省',
  '河南省',
  '湖北省',
  '湖南省',
  '广东省',
  '海南省',
  '四川省',
  '贵州省',
  '云南省',
  '陕西省',
  '甘肃省',
  '青海省',
  '内蒙古自治区',
  '广西壮族自治区',
  '西藏自治区',
  '宁夏回族自治区',
  '新疆维吾尔自治区',
]

const PROVINCE_LIST = PROVINCE_ORDER.filter((p) => CITY_DATA[p])

/** 各省、自治区、直辖市省会（首府），与 PROVINCE_ORDER 对应 */
const PROVINCE_CAPITAL_CITY = {
  北京市: '北京市',
  天津市: '天津市',
  上海市: '上海市',
  重庆市: '重庆市',
  河北省: '石家庄市',
  山西省: '太原市',
  辽宁省: '沈阳市',
  吉林省: '长春市',
  黑龙江省: '哈尔滨市',
  江苏省: '南京市',
  浙江省: '杭州市',
  安徽省: '合肥市',
  福建省: '福州市',
  江西省: '南昌市',
  山东省: '济南市',
  河南省: '郑州市',
  湖北省: '武汉市',
  湖南省: '长沙市',
  广东省: '广州市',
  海南省: '海口市',
  四川省: '成都市',
  贵州省: '贵阳市',
  云南省: '昆明市',
  陕西省: '西安市',
  甘肃省: '兰州市',
  青海省: '西宁市',
  内蒙古自治区: '呼和浩特市',
  广西壮族自治区: '南宁市',
  西藏自治区: '拉萨市',
  宁夏回族自治区: '银川市',
  新疆维吾尔自治区: '乌鲁木齐市',
}

const HOT_CITIES = PROVINCE_ORDER.map((province) => ({
  province,
  city: PROVINCE_CAPITAL_CITY[province],
}))

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

  const currentCityList = useMemo(() => CITY_DATA[selectedProvince] || [], [selectedProvince])

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
    const cities = CITY_DATA[selectedProvinceRef.current] || []
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
    const cities = CITY_DATA[selectedProvince] || []
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
        const cities = CITY_DATA[province] || []
        const ci = cities.findIndex((c) => c.city_name === city)
        if (pi >= 0) scrollProvinceToIndex(pi, 'smooth')
        if (ci >= 0) scrollCityToIndex(ci, 'smooth')
      })
    })
  }

  const handleNext = async () => {
    setIsSaving(true)
    setErrorMessage('')

    const projectAreaId = selectedCityEntry?.projectAreaId ?? '1'

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
                          key={row.city_name}
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
