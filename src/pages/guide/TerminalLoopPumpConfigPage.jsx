import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './GuidePage.css'
import GuideOptionButton from '@/components/GuideOptionButton'
import SliderSettingRow from '@/components/SliderSettingRow'
import { saveTerminalCirculatingPumpConfig } from '@/api/modules/home'
import terminalWaterpumpFigma from '@/assets/guide-init/terminal-waterpump-figma.png'

// 循环泵运行模式配置
const PUMP_MODE_OPTIONS = [
  { id: '定频', label: '定频运行' },
  { id: '变频', label: '变频运行' },
]

function TerminalLoopPumpConfigPage() {
  const navigate = useNavigate()

  // 表单状态
  const [terminalCirculationPumpMain, setTerminalCirculationPumpMain] = useState('1')
  const [terminalCirculationPumpSpare, setTerminalCirculationPumpSpare] = useState('1')
  const [terminalCirculationPumpMode, setTerminalCirculationPumpMode] = useState('定频')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleNext = async () => {
    setIsSaving(true)
    setErrorMessage('')

    try {
      const response = await saveTerminalCirculatingPumpConfig({
        terminalCirculationPumpSpare,
        terminalCirculationPumpMain,
        terminalCirculationPumpMode,
      })

      if (response.data?.state === 'success') {
        navigate('/guide/heat-pump-layout')
      } else {
        setErrorMessage(response.data?.message || '保存失败，请重试')
      }
    } catch (error) {
      console.error('保存末端循环泵配置失败:', error)
      setErrorMessage('保存失败，请检查网络连接')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    navigate('/guide/heat-pump-loop-pump')
  }

  return (
    <div className="guide-page">
      <div className="guide-page__content">
        <div className="guide-page__header">
          <h1 className="guide-page__title">末端循环水泵选择与配置</h1>
          <p className="guide-page__subtitle">
            针对本项目的实际情况进行选择，选择结果会影响系统初始参数预制，请您认真填写
          </p>
        </div>

        <div className="guide-page__grid">
          <div className="guide-page__image guide-page__image--terminal-pump">
            <img src={terminalWaterpumpFigma} alt="" />
          </div>

          <div className="guide-page__section guide-page__section--pump-main">
            <div className="guide-page__section-header">
              <h2 className="guide-page__section-title">主循环泵总数</h2>
              <p className="guide-page__section-desc">
                正常运行所需的台数
              </p>
            </div>
            <div className="guide-page__slider-wrap">
              <SliderSettingRow
                label=""
                value={terminalCirculationPumpMain}
                onChange={setTerminalCirculationPumpMain}
                min={1}
                max={5}
                step={1}
                showInput={false}
                variant="guide"
                keypadTitle="主循环泵总数"
              />
            </div>
          </div>

          <div className="guide-page__section guide-page__section--pump-spare">
            <div className="guide-page__section-header">
              <h2 className="guide-page__section-title">备用循环泵台数</h2>
              <p className="guide-page__section-desc">
                正常运行时备用的台数
              </p>
            </div>
            <div className="guide-page__slider-wrap">
              <SliderSettingRow
                label=""
                value={terminalCirculationPumpSpare}
                onChange={setTerminalCirculationPumpSpare}
                min={0}
                max={5}
                step={1}
                showInput={false}
                variant="guide"
                keypadTitle="备用循环泵台数"
              />
            </div>
          </div>

          <div className="guide-page__section guide-page__section--pump-mode">
            <div className="guide-page__section-header">
              <h2 className="guide-page__section-title">循环泵运行模式</h2>
            </div>
            <div className="guide-page__option-group">
              {PUMP_MODE_OPTIONS.map((option) => (
                <GuideOptionButton
                  key={option.id}
                  label={option.label}
                  selected={terminalCirculationPumpMode === option.id}
                  onClick={() => setTerminalCirculationPumpMode(option.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="guide-page__error">{errorMessage}</div>
        )}

        {/* 底部按钮 - 返回和下一步 */}
        <div className="guide-page__button guide-page__button--prev guide-page__button--loop-pump">
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

export default TerminalLoopPumpConfigPage
