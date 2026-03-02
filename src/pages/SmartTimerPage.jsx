import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import './SmartTimerPage.css'

function TimerModeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="smart-timer-page__mode-icon" aria-hidden="true">
      <path d="M9 3.5h6M12 6.5V8" />
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 13.5 15.3 11.2" />
    </svg>
  )
}

function AllDayModeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="smart-timer-page__mode-icon" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8.2v3.8l2.8 1.9" />
      <text x="12" y="15.2" textAnchor="middle" className="smart-timer-page__mode-icon-text">
        24
      </text>
    </svg>
  )
}

const PLAN_LIST = [
  {
    id: 'plan-1',
    name: '方案一',
    enabled: true,
    weekdays: [
      {
        label: '周一 周二 周三 周四',
        segments: [
          { label: '气候补偿智能调节', color: 'blue', width: 13 },
          { label: '定温模式35℃', color: 'yellow', width: 13 },
          { label: '气候补偿智能调节', color: 'blue', width: 74 },
        ],
      },
      { label: '周五 周六 周日', empty: true },
    ],
  },
  {
    id: 'plan-2',
    name: '方案二',
    enabled: false,
    weekdays: [{ label: '周一 周二 周三 周四 周五 周六 周日', empty: true }],
  },
]

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function SmartTimerPage() {
  const [selectedMode, setSelectedMode] = useState('smart')
  const [showEditor, setShowEditor] = useState(false)

  return (
    <main className="smart-timer-page">
      <section className="smart-timer-page__mode-grid">
        <FeatureInfoCard
          icon={<TimerModeIcon />}
          title="智能定时模式"
          description="自主设定工作时段区间"
          selected={selectedMode === 'smart'}
          selectedBadgePosition="start"
          onClick={() => setSelectedMode('smart')}
          className="smart-timer-page__mode-card"
        />
        <FeatureInfoCard
          icon={<AllDayModeIcon />}
          title="全天候模式"
          description="7*24小时全天候运行"
          selected={selectedMode === 'all-day'}
          onClick={() => setSelectedMode('all-day')}
          className="smart-timer-page__mode-card"
        />
      </section>

      {selectedMode === 'smart' ? (
        <>
          <section className="smart-timer-page__section">
            <h3 className="smart-timer-page__section-title">定时方案</h3>
            <button type="button" className="smart-timer-page__add-btn" onClick={() => setShowEditor(true)}>
              <span>＋</span>
              新增方案
            </button>
          </section>

          <section className="smart-timer-page__plan-list">
            {PLAN_LIST.map((plan) => (
              <article key={plan.id} className="smart-timer-page__plan-card">
                <header className="smart-timer-page__plan-header">
                  <div className="smart-timer-page__plan-title-wrap">
                    <h4>{plan.name}</h4>
                    <button type="button" className="smart-timer-page__edit-btn">✎</button>
                  </div>
                  <button type="button" className={`smart-timer-page__switch${plan.enabled ? ' is-on' : ''}`}>
                    <span className="smart-timer-page__switch-thumb" />
                  </button>
                </header>

                <div className="smart-timer-page__rows">
                  {plan.weekdays.map((weekday) => (
                    <div key={weekday.label} className="smart-timer-page__row-block">
                      <div className="smart-timer-page__weekday">{weekday.label}</div>
                      <div className="smart-timer-page__timeline-meta">
                        <span>0:00</span>
                        {weekday.empty ? (
                          <span>24:00</span>
                        ) : (
                          <>
                            <span>6:00</span>
                            <span>15:00</span>
                            <span>24:00</span>
                          </>
                        )}
                      </div>
                      {weekday.empty ? (
                        <div className="smart-timer-page__empty-bar">暂无设置</div>
                      ) : (
                        <div className="smart-timer-page__timeline">
                          {weekday.segments.map((segment) => (
                            <div
                              key={`${weekday.label}-${segment.label}`}
                              className={`smart-timer-page__segment is-${segment.color}`}
                              style={{ width: `${segment.width}%` }}
                            >
                              {segment.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </>
      ) : null}

      {showEditor ? (
        <div className="smart-timer-page__modal-backdrop" onClick={() => setShowEditor(false)}>
          <section className="smart-timer-page__modal" onClick={(event) => event.stopPropagation()}>
            <header className="smart-timer-page__modal-header">
              <h3>新增定时</h3>
              <button type="button" className="smart-timer-page__modal-close" onClick={() => setShowEditor(false)}>
                ×
              </button>
            </header>

            <div className="smart-timer-page__modal-body">
              <div className="smart-timer-page__editor-title-row">
                <span>方案一</span>
                <button type="button" className="smart-timer-page__switch is-on" aria-pressed="true">
                  <span className="smart-timer-page__switch-thumb" />
                </button>
              </div>

              <div className="smart-timer-page__editor-panel">
                <div className="smart-timer-page__editor-panel-head">
                  <span>周期</span>
                  <button type="button" className="smart-timer-page__circle-icon">−</button>
                </div>

                <div className="smart-timer-page__weekday-btns">
                  {WEEK_DAYS.map((day, index) => (
                    <button key={day} type="button" className={`smart-timer-page__weekday-btn${index <= 3 ? ' is-active' : ''}`}>
                      {day}
                    </button>
                  ))}
                </div>

                <div className="smart-timer-page__editor-subtitle">定时段</div>

                <div className="smart-timer-page__timer-row">
                  <span className="smart-timer-page__time-input">00:00</span>
                  <span className="smart-timer-page__dash">−</span>
                  <span className="smart-timer-page__time-input">08:00</span>
                  <button type="button" className="smart-timer-page__mode-select">气候补偿智能调节</button>
                  <button type="button" className="smart-timer-page__circle-icon">−</button>
                </div>

                <div className="smart-timer-page__timer-row">
                  <span className="smart-timer-page__time-input">08:00</span>
                  <span className="smart-timer-page__dash">−</span>
                  <span className="smart-timer-page__time-input">18:00</span>
                  <button type="button" className="smart-timer-page__mode-select">定温模式</button>
                  <button type="button" className="smart-timer-page__circle-icon">−</button>
                </div>

                <div className="smart-timer-page__temp-row">
                  <span>请输入温度 (0-50)</span>
                  <span>℃</span>
                </div>

                <div className="smart-timer-page__timer-row">
                  <span className="smart-timer-page__time-input">18:00</span>
                  <span className="smart-timer-page__dash">−</span>
                  <span className="smart-timer-page__time-input">24:00</span>
                  <button type="button" className="smart-timer-page__mode-select">气候补偿智能调节</button>
                  <button type="button" className="smart-timer-page__circle-icon is-plus">＋</button>
                </div>
              </div>

              <button type="button" className="smart-timer-page__add-period">⊕ 新增周期</button>

              <div className="smart-timer-page__modal-actions">
                <button type="button" className="smart-timer-page__modal-btn is-danger">删除方案</button>
                <button type="button" className="smart-timer-page__modal-btn is-primary" onClick={() => setShowEditor(false)}>
                  确定
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default SmartTimerPage
