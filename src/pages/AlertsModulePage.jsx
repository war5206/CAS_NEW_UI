import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import SelectDropdown from '../components/SelectDropdown'
import backIcon from '../assets/layout/back.svg'
import { useDeferredVisible } from '../hooks/useDeferredVisible'
import './AlertsModulePage.css'

const SYSTEM_ALARM_ROWS = Array.from({ length: 8 }, (_, index) => ({
  id: `system-${index}`,
  deviceName: '热泵1',
  alarmName: '高压故障',
  level: '四级',
  happenedAt: '24.6.1 17:22:59',
  suggestion: '可能是水泵问题',
}))

const FAULT_TREE_ROWS = [
  {
    code: 'E01',
    name: '错相保护',
    reasons: ['380v机组主电源相序错误', '电源相序检测板接线错误', '电源相序检测板故障'],
    plan: '可能是水泵问题',
  },
  {
    code: 'E02',
    name: '缺相保护',
    reasons: ['主供电380v电源三相缺', '主供电空开损坏（输出端）'],
    plan: '可能是水泵问题',
  },
  {
    code: 'E03',
    name: '水流开关保护',
    reasons: ['查看循环水泵不满足要求', '循环水泵发生气堵'],
    plan: '水泵排气',
  },
]

const TREND_TYPE_OPTIONS = [
  { value: 'trend', label: '告警趋势' },
  { value: 'category', label: '告警分类统计' },
]

const TREND_CHART_DATA_DAY = [6, 7, 8, 4, 3, 1, 0.1, 0.1, 2, 3, 3, 2]
const TREND_CHART_DATA_MONTH = [600, 700, 800, 400, 300, 100, 8, 8, 200, 300, 400, 200]

function AlarmChart({ period, mode }) {
  const chartRef = useRef(null)
  const shouldInitChart = useDeferredVisible(chartRef)

  useEffect(() => {
    if (!shouldInitChart || !chartRef.current || mode !== 'trend') {
      return undefined
    }

    const chart = echarts.init(chartRef.current)
    const data = period === 'day' ? TREND_CHART_DATA_DAY : TREND_CHART_DATA_MONTH
    const xData =
      period === 'day'
        ? ['04-01', '04-02', '04-03', '04-04', '04-05', '04-06', '04-07', '04-08', '04-09', '04-10', '04-11', '04-12']
        : ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 54, right: 30, top: 30, bottom: 46 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 22, 34, 0.95)',
        borderColor: 'rgba(88, 109, 142, 0.72)',
        textStyle: { color: '#eaf1ff' },
      },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: 'rgba(197, 209, 228, 0.86)', fontSize: 20 },
        itemWidth: 18,
        itemHeight: 18,
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: 'rgba(154, 170, 196, 0.54)' } },
        axisTick: { show: false },
        axisLabel: {
          color: 'rgba(164, 179, 202, 0.92)',
          margin: 20,
          fontSize: 18,
        },
      },
      yAxis: {
        type: 'value',
        max: period === 'day' ? 10 : 1000,
        splitNumber: 10,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: 'rgba(164, 179, 202, 0.92)',
          fontSize: 16,
          margin: 16,
        },
        splitLine: { lineStyle: { color: 'rgba(181, 197, 219, 0.36)', type: 'dashed' } },
      },
      series: [
        {
          name: '告警量',
          type: 'bar',
          data,
          barMaxWidth: 56,
          itemStyle: {
            borderRadius: [14, 14, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(177, 209, 11, 0.95)' },
              { offset: 0.72, color: 'rgba(170, 199, 12, 0.92)' },
              { offset: 1, color: 'rgba(92, 105, 38, 0.26)' },
            ]),
          },
        },
      ],
    })

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [mode, period, shouldInitChart])

  return <div ref={chartRef} className="alerts-analysis__chart" />
}

function SystemAlarmPage() {
  const [isHistoryView, setIsHistoryView] = useState(false)

  return (
    <div className="alerts-page">
      {isHistoryView ? (
        <>
          <div className="alerts-page__top-breadcrumb">报警管理 &gt; 系统报警 &gt; 历史报警</div>
          <div className="alerts-page__history-header">
            <button type="button" className="alerts-icon-button" onClick={() => setIsHistoryView(false)}>
              <img src={backIcon} alt="返回" />
            </button>
            <h3>历史报警</h3>
          </div>
          <div className="alerts-filter-bar alerts-filter-bar--history">
            <div className="alerts-field"><span>名称</span><button type="button">高压故障</button></div>
            <div className="alerts-field"><span>报警等级</span><button type="button">四级</button></div>
            <div className="alerts-field"><span>采暖季</span><button type="button">2024.06.01 17:50:00</button></div>
            <div className="alerts-field"><span>—</span><button type="button" className="is-placeholder">请选择时间</button></div>
            <button type="button" className="alerts-primary-btn">查询</button>
          </div>
        </>
      ) : (
        <div className="alerts-filter-bar">
          <div className="alerts-field"><span>名称</span><button type="button">高压故障</button></div>
          <div className="alerts-field"><span>报警等级</span><button type="button">四级</button></div>
          <button type="button" className="alerts-primary-btn">查询</button>
          <button type="button" className="alerts-link-btn" onClick={() => setIsHistoryView(true)}>历史报警</button>
        </div>
      )}

      <div className="alerts-table-wrap">
        <table className="alerts-table">
          <thead>
            <tr>
              <th>设备名称</th>
              <th>报警名称</th>
              <th>报警等级</th>
              <th>发生时间</th>
              <th>处理建议</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {SYSTEM_ALARM_ROWS.map((row) => (
              <tr key={row.id}>
                <td>{row.deviceName}</td>
                <td>{row.alarmName}</td>
                <td>{row.level}</td>
                <td>{row.happenedAt}</td>
                <td>{row.suggestion}</td>
                <td>
                  <div className="alerts-actions">
                    <button type="button" className="alerts-primary-btn is-mini">处理</button>
                    <button type="button" className="alerts-dark-btn">查看</button>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="is-empty"><td colSpan={6}>.</td></tr>
            <tr className="is-empty"><td colSpan={6}>.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FaultTreePage() {
  const flattenedRows = useMemo(
    () =>
      FAULT_TREE_ROWS.flatMap((item) =>
        item.reasons.map((reason, index) => ({
          rowId: `${item.code}-${index}`,
          code: index === 0 ? item.code : '',
          name: index === 0 ? item.name : '',
          reason,
          plan: index === item.reasons.length - 1 ? item.plan : '可能是水泵问题',
        })),
      ),
    [],
  )

  return (
    <div className="alerts-page">
      <div className="alerts-filter-bar">
        <div className="alerts-field"><span>代码</span><button type="button">全部</button></div>
        <div className="alerts-field"><span>报警等级</span><button type="button">四级</button></div>
        <button type="button" className="alerts-primary-btn">查询</button>
        <button type="button" className="alerts-link-btn">更新故障树</button>
      </div>

      <div className="alerts-table-wrap">
        <table className="alerts-table alerts-table--fault-tree">
          <thead>
            <tr>
              <th>故障代码</th>
              <th>故障名称</th>
              <th>原因分析</th>
              <th>解决方案</th>
            </tr>
          </thead>
          <tbody>
            {flattenedRows.map((row) => (
              <tr key={row.rowId}>
                <td>{row.code}</td>
                <td>{row.name}</td>
                <td>{row.reason}</td>
                <td>{row.plan}</td>
              </tr>
            ))}
            <tr className="is-empty"><td colSpan={4}>.</td></tr>
            <tr className="is-empty"><td colSpan={4}>.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AlarmAnalysisPage() {
  const [period, setPeriod] = useState('day')
  const [mode, setMode] = useState('trend')

  return (
    <div className="alerts-analysis">
      <div className="alerts-analysis__toolbar">
        <button type="button" className="alerts-analysis__date-btn">{period === 'day' ? '2024-04' : '2024.06'}</button>
        {period === 'month' ? (
          <>
            <span className="alerts-analysis__range-separator">—</span>
            <button type="button" className="alerts-analysis__date-btn is-placeholder">请选择时间</button>
            <button type="button" className="alerts-primary-btn">查询</button>
          </>
        ) : null}

        <div className="alerts-analysis__period-switch">
          <button type="button" className={period === 'day' ? 'is-active' : ''} onClick={() => setPeriod('day')}>日</button>
          <button type="button" className={period === 'month' ? 'is-active' : ''} onClick={() => setPeriod('month')}>月</button>
        </div>
      </div>

      <div className="alerts-analysis__summary">
        <article><span>总告警数</span><strong>4221 个</strong></article>
        <article><span>未处理告警数</span><strong>4221 个</strong></article>
        <article><span>高故障率热泵</span><strong>热泵4</strong></article>
        <article><span>常见故障</span><strong>水流故障</strong></article>
      </div>

      <div className="alerts-analysis__mode-row">
        <SelectDropdown
          options={TREND_TYPE_OPTIONS}
          value={mode}
          onChange={setMode}
          className="alerts-analysis__mode-select"
          triggerClassName="alerts-analysis__mode-trigger"
          dropdownClassName="alerts-analysis__mode-dropdown"
          optionClassName="alerts-analysis__mode-option"
        />
      </div>

      {mode === 'trend' ? (
        <AlarmChart period={period} mode={mode} />
      ) : (
        <div className="alerts-analysis__category-grid">
          <div className="alerts-analysis__category-card">
            <div className="alerts-analysis__card-title">系统故障分布</div>
            <AlarmChart period={period} mode="trend" />
          </div>
          <div className="alerts-analysis__category-card">
            <div className="alerts-analysis__card-title">设备故障分布</div>
            <div className="alerts-analysis__pie-wrap">
              <div className="alerts-analysis__pie" />
              <ul>
                <li><span className="is-blue" />末端1号水泵故障</li>
                <li><span className="is-purple" />末端2号水泵故障</li>
                <li><span className="is-green" />用户侧回水温感故障</li>
                <li><span className="is-orange" />冷凝水管道温感故障</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AlertsModulePage({ sectionId }) {
  if (sectionId === 'system-alarm') {
    return <SystemAlarmPage />
  }

  if (sectionId === 'fault-tree') {
    return <FaultTreePage />
  }

  if (sectionId === 'alarm-analysis') {
    return <AlarmAnalysisPage />
  }

  return null
}

export default AlertsModulePage
