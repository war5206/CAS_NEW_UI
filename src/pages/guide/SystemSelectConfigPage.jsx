import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './GuidePage.css'
import GuideOptionButton from '@/components/GuideOptionButton'
import SliderSettingRow from '@/components/SliderSettingRow'
import { saveSystemConfig } from '@/api/modules/home'
import { useGuideStore } from '@/features/guide/hooks/useGuideStore'

// 项目需求类型配置
const PROJECT_TYPE_OPTIONS = [
  { id: '1', label: '采暖' },
  { id: '2', label: '冷暖' },
  { id: '3', label: '热水' },
]

// 供暖末端类型配置
const TERMINAL_TYPE_OPTIONS = [
  { id: '1', label: '地暖' },
  { id: '2', label: '暖气片' },
  { id: '3', label: '风机盘管' },
]

// 系统循环形式配置
const SYSTEM_TYPE_OPTIONS = [
  { id: '1', label: '一次系统' },
  { id: '2', label: '二次系统' },
]

// 耦合能源类型配置（id '5' 为无耦合能源，台数须为 0）
const COUPLE_ENERGY_TYPE_NONE_ID = '5'
const COUPLE_ENERGY_TYPE_OPTIONS = [
  { id: '1', label: '电锅炉' },
  { id: '2', label: '燃气锅炉' },
  { id: '3', label: '水源热泵' },
  { id: '4', label: '风冷模块' },
  { id: '5', label: '无耦合能源' },
]

// 耦合能源设备台数配置
const COUPLE_ENERGY_NUMBER_OPTIONS = ['0', '1', '2', '3', '4', '5']

function SystemSelectConfigPage() {
  const navigate = useNavigate()
  const {
    setSystemTypeId,
    setSystemConfig,
    projectTypeId: savedProjectTypeId,
    heatPump: savedHeatPump,
    terminalTypeId: savedTerminalTypeId,
    systemTypeId: savedSystemTypeId,
    coupleEnergyTypeId: savedCoupleEnergyTypeId,
    coupleEnergyNumber: savedCoupleEnergyNumber,
  } = useGuideStore()

  // 表单状态 - 从store初始化
  const [projectTypeId, setProjectTypeId] = useState(savedProjectTypeId || '1')
  const [heatPump, setHeatPump] = useState(savedHeatPump || '7')
  const [terminalTypeId, setTerminalTypeId] = useState(savedTerminalTypeId || '1')
  const [systemTypeId, setSystemTypeIdLocal] = useState(savedSystemTypeId || '1')
  const [coupleEnergyTypeId, setCoupleEnergyTypeId] = useState(savedCoupleEnergyTypeId || '2')
  const [coupleEnergyNumber, setCoupleEnergyNumber] = useState(savedCoupleEnergyNumber || '1')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // 实时保存到store
  useEffect(() => {
    setSystemConfig({
      projectTypeId,
      heatPump,
      terminalTypeId,
      systemTypeId,
      coupleEnergyTypeId,
      coupleEnergyNumber,
    })
  }, [projectTypeId, heatPump, terminalTypeId, systemTypeId, coupleEnergyTypeId, coupleEnergyNumber, setSystemConfig])

  const handleNext = async () => {
    setIsSaving(true)
    setErrorMessage('')

    let coupleEnergyNumberToSave = coupleEnergyNumber
    if (
      coupleEnergyTypeId === COUPLE_ENERGY_TYPE_NONE_ID &&
      coupleEnergyNumber !== '0'
    ) {
      coupleEnergyNumberToSave = '0'
      setCoupleEnergyNumber('0')
    }

    try {
      const response = await saveSystemConfig({
        projectTypeId,
        heatPump,
        terminalTypeId,
        coupleEnergyTypeId,
        systemTypeId,
        coupleEnergyNumber: coupleEnergyNumberToSave,
      })

      if (response.data?.state === 'success') {
        setSystemTypeId(systemTypeId)
        navigate('/guide/project-info')
      } else {
        setErrorMessage(response.data?.message || '保存失败，请重试')
      }
    } catch (error) {
      console.error('保存系统配置失败:', error)
      setErrorMessage('保存失败，请检查网络连接')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="guide-page">
      <div className="guide-page__content">
        {/* 页面头部 */}
        <div className="guide-page__header">
          <h1 className={`guide-page__title${errorMessage ? ' is-error' : ''}`}>
            {errorMessage || '系统选择与配置'}
          </h1>
          {!errorMessage && (
            <p className="guide-page__subtitle">
              针对本项目的实际情况进行选择，选择结果会影响系统初始参数预置，请您认真填写
            </p>
          )}
        </div>

        {/* 项目需求类型 - 左上 */}
        <div className="guide-page__section guide-page__section--project-type">
          <div className="guide-page__section-header">
            <h2 className="guide-page__section-title">项目需求类型</h2>
            <p className="guide-page__section-desc">
              请选择会直接影响系统的算法配置和功能，请根据实际情况准确填写
            </p>
          </div>
          <div className="guide-page__option-group">
            {PROJECT_TYPE_OPTIONS.map((option) => (
              <GuideOptionButton
                key={option.id}
                label={option.label}
                selected={projectTypeId === option.id}
                onClick={() => setProjectTypeId(option.id)}
              />
            ))}
          </div>
        </div>

        {/* 空气源热泵台数 - 右上 */}
        <div className="guide-page__section guide-page__section--heatpump-count">
          <div className="guide-page__section-header">
            <h2 className="guide-page__section-title">空气源热泵台数</h2>
            <p className="guide-page__section-desc">
              指本系统实际控制的空气源热泵数量，最多支持50台
            </p>
          </div>
          <div className="guide-page__slider-wrap">
            <SliderSettingRow
              label=""
              value={heatPump}
              onChange={setHeatPump}
              min={1}
              max={50}
              step={1}
              showInput={false}
              keypadTitle="空气源热泵台数"
            />
          </div>
        </div>

        {/* 供暖末端类型 - 左中 */}
        <div className="guide-page__section guide-page__section--terminal-type">
          <div className="guide-page__section-header">
            <h2 className="guide-page__section-title">供暖末端类型</h2>
            <p className="guide-page__section-desc">
              根据供暖末端主要形式进行填写，如多种末端情况下，应以供暖末端为选择项
            </p>
          </div>
          <div className="guide-page__option-group">
            {TERMINAL_TYPE_OPTIONS.map((option) => (
              <GuideOptionButton
                key={option.id}
                label={option.label}
                selected={terminalTypeId === option.id}
                onClick={() => setTerminalTypeId(option.id)}
              />
            ))}
          </div>
        </div>

        {/* 耦合能源类型 - 右中 */}
        <div className="guide-page__section guide-page__section--couple-energy-type">
          <div className="guide-page__section-header">
            <h2 className="guide-page__section-title">耦合能源类型</h2>
            <p className="guide-page__section-desc">
              本项为系统运行过程中实际配备的耦合能源类型，仅支持单一耦合能源
            </p>
          </div>
          <div className="guide-page__option-group">
            {COUPLE_ENERGY_TYPE_OPTIONS.map((option) => (
              <GuideOptionButton
                key={option.id}
                label={option.label}
                selected={coupleEnergyTypeId === option.id}
                onClick={() => {
                  setCoupleEnergyTypeId(option.id)
                  if (option.id === COUPLE_ENERGY_TYPE_NONE_ID) {
                    setCoupleEnergyNumber('0')
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* 系统循环形式 - 左下 */}
        <div className="guide-page__section guide-page__section--system-type">
          <div className="guide-page__section-header">
            <h2 className="guide-page__section-title">系统循环形式</h2>
            <p className="guide-page__section-desc">
              本选项主要是针对主机与末端的水泵循环形式
            </p>
          </div>
          <div className="guide-page__option-group">
            {SYSTEM_TYPE_OPTIONS.map((option) => (
              <GuideOptionButton
                key={option.id}
                label={option.label}
                selected={systemTypeId === option.id}
                onClick={() => setSystemTypeIdLocal(option.id)}
              />
            ))}
          </div>
        </div>

        {/* 耦合能源设备台数 - 右下 */}
        <div className="guide-page__section guide-page__section--couple-energy-count">
          <div className="guide-page__section-header">
            <h2 className="guide-page__section-title">耦合能源设备台数</h2>
            <p className="guide-page__section-desc">
              耦合能源台数最多支持5台，不限制其功率数据
            </p>
          </div>
          <div className="guide-page__option-group">
            {COUPLE_ENERGY_NUMBER_OPTIONS.map((num) => (
              <GuideOptionButton
                key={num}
                label={num}
                selected={coupleEnergyNumber === num}
                onClick={() => setCoupleEnergyNumber(num)}
              />
            ))}
          </div>
        </div>

        <div className="guide-page__button guide-page__button--prev">
          <button
            type="button"
            className="guide-page__btn is-primary"
            onClick={handleNext}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SystemSelectConfigPage
