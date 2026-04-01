import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './GuidePage.css'
import MonthDayPicker from '@/components/MonthDayPicker'
import deleteIcon from '@/assets/common/delete.svg'
import { saveProjectConfig } from '@/api/modules/home'
import { useGuideStore } from '@/features/guide/hooks/useGuideStore'

// 键盘按键
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete']

function ProjectInfoPage() {
  const navigate = useNavigate()
  const {
    setProjectInfo,
    projectAcreage: savedProjectAcreage,
    coldAcreage: savedColdAcreage,
    startHeatingSeason: savedStartHeatingSeason,
    endHeatingSeason: savedEndHeatingSeason,
  } = useGuideStore()

  // 表单状态 - 从store初始化
  const [projectAcreage, setProjectAcreage] = useState(savedProjectAcreage || '')
  const [coldAcreage, setColdAcreage] = useState(savedColdAcreage || '')
  const [startHeatingSeason, setStartHeatingSeason] = useState(savedStartHeatingSeason || '')
  const [endHeatingSeason, setEndHeatingSeason] = useState(savedEndHeatingSeason || '')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // 数字键盘状态
  const [activeKeypad, setActiveKeypad] = useState(null) // 'heating' | 'cooling' | null

  // 页面引用用于点击空白区域检测
  const pageRef = useRef(null)

  // 实时保存到store
  useEffect(() => {
    setProjectInfo({
      projectAcreage,
      coldAcreage,
      startHeatingSeason,
      endHeatingSeason,
    })
  }, [projectAcreage, coldAcreage, startHeatingSeason, endHeatingSeason, setProjectInfo])

  // 点击空白区域取消选中
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pageRef.current && !pageRef.current.contains(event.target)) {
        // 检查点击的是否是输入框或键盘
        const target = event.target
        const isInput = target.closest('.guide-page__numeric-input')
        const isKeypad = target.closest('.guide-page__keypad')
        const isDatePicker = target.closest('.guide-page__date-picker')
        const isButton = target.closest('.guide-page__btn')

        if (!isInput && !isKeypad && !isDatePicker && !isButton && activeKeypad) {
          handleKeypadConfirm()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeKeypad])

  const handleKeypadOpen = (type) => {
    setActiveKeypad(type)
  }

  const handleKeyPress = (key) => {
    if (!activeKeypad) return

    const getCurrentValue = () => {
      return activeKeypad === 'heating' ? projectAcreage : coldAcreage
    }

    const setCurrentValue = (newValue) => {
      if (activeKeypad === 'heating') {
        setProjectAcreage(newValue)
      } else {
        setColdAcreage(newValue)
      }
    }

    const currentValue = getCurrentValue() || ''

    if (key === 'delete') {
      setCurrentValue(currentValue.slice(0, -1))
      return
    }

    if (key === '.') {
      if (currentValue.includes('.')) {
        return
      }
      setCurrentValue(currentValue ? `${currentValue}.` : '0.')
      return
    }

    if (currentValue === '0') {
      setCurrentValue(key)
      return
    }

    setCurrentValue(`${currentValue}${key}`)
  }

  const handleKeypadConfirm = () => {
    // 移除末尾的小数点
    if (activeKeypad === 'heating' && projectAcreage.endsWith('.')) {
      setProjectAcreage(projectAcreage.slice(0, -1))
    } else if (activeKeypad === 'cooling' && coldAcreage.endsWith('.')) {
      setColdAcreage(coldAcreage.slice(0, -1))
    }
    setActiveKeypad(null)
  }

  const handleNext = async () => {
    setIsSaving(true)
    setErrorMessage('')

    try {
      const response = await saveProjectConfig({
        endHeatingSeason,
        projectAcreage,
        coldAcreage,
        startHeatingSeason,
      })

      if (response.data?.state === 'success') {
        navigate('/guide/area-select')
      } else {
        setErrorMessage(response.data?.message || '保存失败，请重试')
      }
    } catch (error) {
      console.error('保存项目信息失败:', error)
      setErrorMessage('保存失败，请检查网络连接')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    navigate('/guide/system-config')
  }

  // 点击日期选择器时退出编辑模式
  const handleDatePickerClick = () => {
    if (activeKeypad) {
      handleKeypadConfirm()
    }
  }

  return (
    <div className="guide-page" ref={pageRef}>
      <div className="guide-page__content">
        <div className="guide-page__header">
          <h1 className="guide-page__title">项目基本信息</h1>
          <p className="guide-page__subtitle">
            进行项目的基本信息的采集，对费用分析等更加准确
          </p>
        </div>

        {/* 供暖面积 */}
        <div className="guide-page__section guide-page__section--heating-acreage">
          <div className="guide-page__section-header">
            <h2 className="guide-page__section-title">供暖面积</h2>
            <p className="guide-page__section-desc">
              根据实际功能面积进行填写，此面积为该系统承担的供暖面积
            </p>
          </div>
          <button
            type="button"
            className={`guide-page__numeric-input ${activeKeypad === 'heating' ? 'guide-page__numeric-input--active' : ''}`}
            onClick={() => handleKeypadOpen('heating')}
          >
            <span className={`guide-page__numeric-input-value ${!projectAcreage ? 'guide-page__numeric-input-value--placeholder' : ''}`}>
              {projectAcreage || '请输入实际面积'}
            </span>
            <span className="guide-page__numeric-input-unit">㎡</span>
          </button>
        </div>

        {/* 供冷面积 */}
        <div className="guide-page__section guide-page__section--cooling-acreage">
          <div className="guide-page__section-header">
            <h2 className="guide-page__section-title">供冷面积</h2>
            <p className="guide-page__section-desc">
              根据实际的供冷面积进行填写，此面积为该系统承担的供冷面积
            </p>
          </div>
          <button
            type="button"
            className={`guide-page__numeric-input ${activeKeypad === 'cooling' ? 'guide-page__numeric-input--active' : ''}`}
            onClick={() => handleKeypadOpen('cooling')}
          >
            <span className={`guide-page__numeric-input-value ${!coldAcreage ? 'guide-page__numeric-input-value--placeholder' : ''}`}>
              {coldAcreage || '请输入实际面积'}
            </span>
            <span className="guide-page__numeric-input-unit">㎡</span>
          </button>
        </div>

        {/* 供暖季 */}
        <div className="guide-page__section guide-page__section--heating-season">
          <div className="guide-page__section-header">
            <h2 className="guide-page__section-title">供暖季</h2>
            <p className="guide-page__section-desc">
              根据当地情况进行填写
            </p>
          </div>
          <div className="guide-page__date-picker-group">
            <div onClick={handleDatePickerClick}>
              <MonthDayPicker
                value={startHeatingSeason}
                onChange={(date) => setStartHeatingSeason(date)}
                placeholder="请选择时间"
                className="guide-page__date-picker"
              />
            </div>
            <div className="guide-page__date-separator" />
            <div onClick={handleDatePickerClick}>
              <MonthDayPicker
                value={endHeatingSeason}
                onChange={(date) => setEndHeatingSeason(date)}
                placeholder="请选择时间"
                className="guide-page__date-picker"
              />
            </div>
          </div>
        </div>

        {/* 数字键盘 - 始终显示 */}
        <div className="guide-page__keypad">
          {KEYPAD_KEYS.map((key) => {
            const isDelete = key === 'delete'
            return (
              <button
                key={key}
                type="button"
                className="guide-page__keypad-button"
                onClick={() => {
                  if (isDelete) {
                    handleKeyPress('delete')
                  } else {
                    handleKeyPress(key)
                  }
                }}
              >
                {isDelete ? (
                  <img src={deleteIcon} alt="" className="guide-page__keypad-button-icon" />
                ) : (
                  <span className="guide-page__keypad-button-text">{key}</span>
                )}
              </button>
            )
          })}
        </div>

        {errorMessage && (
          <div className="guide-page__error">{errorMessage}</div>
        )}

        {/* 底部按钮 - 返回和下一步 */}
        <div className="guide-page__button guide-page__button--prev">
          <button
            type="button"
            className="guide-page__btn"
            onClick={handleBack}
            disabled={isSaving}
          >
            返回
          </button>
          <button
            type="button"
            className="guide-page__btn is-primary"
            onClick={() => {
              if (activeKeypad) {
                handleKeypadConfirm()
              } else {
                handleNext()
              }
            }}
            disabled={isSaving && !activeKeypad}
          >
            {isSaving ? '保存中...' : (activeKeypad ? '确定' : '下一步')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectInfoPage
