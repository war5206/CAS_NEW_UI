import { useState } from 'react'
import DataOverviewFilterBar from '../components/DataOverviewFilterBar'
import DataOverviewChart from '../components/DataOverviewChart'
import upIcon from '../assets/icons/data-up.svg'
import downIcon from '../assets/icons/data-down.svg'
import './DataOverviewPage.css'

const metrics = [
  { title: 'COP', value: '2.0', color: '#FF5A36', trend: '+3.2%', trendDir: 'up' },
  { title: '总供热量（千瓦时）', value: '645.12', color: '#6B3DFF', trend: '+3.2%', trendDir: 'up' },
  { title: '节费比（%）', value: '10.01', color: '#F4AE21', trend: null, trendDir: null },
  { title: '费用（元）', value: '总 800.01    每平 10.01', color: '#D749C7', trend: '-3.2%', trendDir: 'down' },
  { title: '耗电量（千瓦时）', value: '总 2156    每平 6.55', color: '#22A8FF', trend: '+3.2%', trendDir: 'up' },
  { title: '节碳量（吨）', value: '10.01', color: '#62F96D', trend: null, trendDir: null },
]

function DataOverviewPage() {
  const [period, setPeriod] = useState('月')
  const [compareMode, setCompareMode] = useState('none')

  return (
    <main className="data-overview-page">
      <h2 className="data-overview-page__title">本采暖季（24.11.04-25.03.25）</h2>
      <p className="data-overview-page__tip">热表精度影响COP，COP仅作参考；节碳量以供热数据为准；</p>

      <section className="data-overview-page__cards">
        {metrics.map((metric) => (
          <article key={metric.title} className="data-overview-page__card">
            <div className="data-overview-page__card-head">
              <div className="data-overview-page__card-label">
                <span style={{ backgroundColor: metric.color }} />
                {metric.title}
              </div>
              {metric.trend ? (
                <div className={`data-overview-page__trend is-${metric.trendDir}`}>
                  <img src={metric.trendDir === 'up' ? upIcon : downIcon} alt="" aria-hidden="true" />
                  {metric.trend}
                </div>
              ) : (
                <span className="data-overview-page__trend-placeholder">—</span>
              )}
            </div>
            <div className="data-overview-page__card-value">{metric.value}</div>
          </article>
        ))}
      </section>

      <div className="data-overview-page__dots">
        <span className="is-active" />
        <span />
        <span />
      </div>

      <DataOverviewFilterBar
        period={period}
        onPeriodChange={setPeriod}
        compareMode={compareMode}
        onCompareModeChange={setCompareMode}
      />

      <DataOverviewChart compareMode={compareMode} />
    </main>
  )
}

export default DataOverviewPage
