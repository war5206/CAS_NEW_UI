import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import hpRunningIcon from '../assets/heat-pump/hp-running.svg'
import hpMalfunctionIcon from '../assets/heat-pump/hp-malfunction.svg'
import hpDefrostingIcon from '../assets/heat-pump/hp-defrosting.svg'
import hpShutdownIcon from '../assets/heat-pump/hp-shutdown.svg'
import hpNullIcon from '../assets/heat-pump/hp-null.svg'
import hpModalRunningIcon from '../assets/heat-pump/hp-modal-running.svg'
import hpModalMalfunctionIcon from '../assets/heat-pump/hp-modal-malfunction.svg'
import hpModalDefrostingIcon from '../assets/heat-pump/hp-modal-defrosting.svg'
import hpModalShutdownIcon from '../assets/heat-pump/hp-modal-shutdown.svg'
import micoeInfiniteLogo from '../assets/brand/micoe-infinite.png'
import backIcon from '../assets/layout/back.svg'
import {
  HEAT_PUMP_DETAIL_LABEL,
  HEAT_PUMP_GRID_COLS,
  HEAT_PUMP_GRID_ITEMS,
  HEAT_PUMP_GRID_ROWS,
  HEAT_PUMP_STATUS,
  HEAT_PUMP_STATUS_LABEL,
} from '../config/homeHeatPumps'

const HEAT_PUMP_ICON_MAP = {
  [HEAT_PUMP_STATUS.RUNNING]: hpRunningIcon,
  [HEAT_PUMP_STATUS.MALFUNCTION]: hpMalfunctionIcon,
  [HEAT_PUMP_STATUS.DEFROSTING]: hpDefrostingIcon,
  [HEAT_PUMP_STATUS.SHUTDOWN]: hpShutdownIcon,
  [HEAT_PUMP_STATUS.EMPTY]: hpNullIcon,
}

const HEAT_PUMP_MODAL_ICON_MAP = {
  [HEAT_PUMP_STATUS.RUNNING]: hpModalRunningIcon,
  [HEAT_PUMP_STATUS.MALFUNCTION]: hpModalMalfunctionIcon,
  [HEAT_PUMP_STATUS.DEFROSTING]: hpModalDefrostingIcon,
  [HEAT_PUMP_STATUS.SHUTDOWN]: hpModalShutdownIcon,
}

const stopPointerEvent = (event) => {
  event.stopPropagation()
}

const HEAT_PUMP_OVERVIEW_PAGE_SIZE = 10

const HEAT_PUMP_OVERVIEW_TEXT = {
  BUTTON: '热泵总览',
  TITLE: '热泵机总览',
  PUMP_NAME: '热泵序号',
  MODE_STATUS: '模式状态',
  PREV_PAGE: '上一页',
  NEXT_PAGE: '下一页',
  PAGE_PREFIX: '第',
  PAGE_SUFFIX: '页',
  CLOSE: '关闭',
  BACK_HOME: '返回主页',
  EMPTY_PUMP: '无热泵',
  TIP: '蓝色设备运行中，红色设备有故障，灰色设备已待机，黄色设备正在化霜；点击热泵可查看详情。',
}

function HomeHeatPumpOverview({onBack}) {
  const [activePump, setActivePump] = useState(null)
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false)
  const [overviewPage, setOverviewPage] = useState(1)

  useEffect(() => {
    if (!activePump && !isOverviewModalOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') {
        return
      }

      if (activePump) {
        setActivePump(null)
        return
      }

      setIsOverviewModalOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePump, isOverviewModalOpen])

  const rowLabels = useMemo(
    () => Array.from({length: HEAT_PUMP_GRID_ROWS}, (_, index) => index + 1),
    [],
  )
  const colLabels = useMemo(
    () => Array.from({length: HEAT_PUMP_GRID_COLS}, (_, index) => index + 1),
    [],
  )
  const boardGridStyle = useMemo(
    () => ({
      '--hp-grid-cols': HEAT_PUMP_GRID_COLS,
      '--hp-grid-rows': HEAT_PUMP_GRID_ROWS,
    }),
    [],
  )

  const allHeatPumps = useMemo(() => HEAT_PUMP_GRID_ITEMS.filter((item) => item.id !== null), [])

  const metricLabels = useMemo(() => {
    const labels = new Set()
    allHeatPumps.forEach((pump) => {
      pump.details.forEach((metric) => {
        if (metric.label !== HEAT_PUMP_DETAIL_LABEL.MODE_STATUS) {
          labels.add(metric.label)
        }
      })
    })
    return Array.from(labels)
  }, [allHeatPumps])

  const totalOverviewPages = useMemo(
    () => Math.max(1, Math.ceil(allHeatPumps.length / HEAT_PUMP_OVERVIEW_PAGE_SIZE)),
    [allHeatPumps.length],
  )

  const pagedHeatPumps = useMemo(() => {
    const startIndex = (overviewPage - 1) * HEAT_PUMP_OVERVIEW_PAGE_SIZE
    return allHeatPumps.slice(startIndex, startIndex + HEAT_PUMP_OVERVIEW_PAGE_SIZE)
  }, [allHeatPumps, overviewPage])

  const emptyRowCount = Math.max(0, HEAT_PUMP_OVERVIEW_PAGE_SIZE - pagedHeatPumps.length)

  useEffect(() => {
    if (overviewPage > totalOverviewPages) {
      setOverviewPage(totalOverviewPages)
    }
  }, [overviewPage, totalOverviewPages])

  const openOverviewModal = () => {
    setOverviewPage(1)
    setIsOverviewModalOpen(true)
  }

  const closeOverviewModal = () => {
    setIsOverviewModalOpen(false)
  }

  return (
    <>
      <div className="home-hp-overview">
        <div className="home-hp-toolbar">
          {onBack ? (
            <button type="button" className="home-subpage-back" onClick={onBack} aria-label={HEAT_PUMP_OVERVIEW_TEXT.BACK_HOME}>
              <img src={backIcon} alt="" aria-hidden="true" className="home-subpage-back-icon" />
            </button>
          ) : (
            <span className="home-hp-toolbar-placeholder" aria-hidden="true" />
          )}
          <button type="button" className="home-hp-overview-button" onClick={openOverviewModal}>
            {HEAT_PUMP_OVERVIEW_TEXT.BUTTON}
          </button>
        </div>

        <p className="home-hp-tip">{HEAT_PUMP_OVERVIEW_TEXT.TIP}</p>

        <div className="home-hp-scroll">
          <div className="home-hp-board" style={boardGridStyle}>
            <div className="home-hp-axis-cell home-hp-axis-cell-corner" style={{gridColumn: 1, gridRow: 1}} />
            {colLabels.map((colLabel) => (
              <div
                key={`hp-col-${colLabel}`}
                className="home-hp-axis-cell home-hp-axis-cell-col"
                style={{gridColumn: colLabel + 1, gridRow: 1}}
              >
                {colLabel}
              </div>
            ))}

            {rowLabels.map((rowLabel) => (
              <div
                key={`hp-row-${rowLabel}`}
                className="home-hp-axis-cell home-hp-axis-cell-row"
                style={{gridColumn: 1, gridRow: rowLabel + 1}}
              >
                {rowLabel}
              </div>
            ))}

            {HEAT_PUMP_GRID_ITEMS.map((item) => {
              const icon = HEAT_PUMP_ICON_MAP[item.status]
              const isEmpty = item.status === HEAT_PUMP_STATUS.EMPTY

              return (
                <button
                  key={item.key}
                  type="button"
                  className={`home-hp-card is-${item.status}`}
                  style={{gridColumn: item.col + 1, gridRow: item.row + 1}}
                  disabled={isEmpty}
                  onClick={() => {
                    if (!isEmpty) {
                      setActivePump(item)
                    }
                  }}
                  aria-label={isEmpty ? HEAT_PUMP_OVERVIEW_TEXT.EMPTY_PUMP : item.name}
                >
                  {!isEmpty ? <div className="home-hp-card-id">{item.label}</div> : null}
                  <img src={icon} alt="" aria-hidden="true" className="home-hp-card-icon" />
                  {!isEmpty ? (
                    <img src={micoeInfiniteLogo} alt="" aria-hidden="true" className="home-hp-card-logo" />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {activePump
        ? createPortal(
          <div
            className="home-hp-modal-backdrop"
            onClick={() => setActivePump(null)}
            onPointerDown={stopPointerEvent}
            onPointerMove={stopPointerEvent}
            onPointerUp={stopPointerEvent}
            onPointerCancel={stopPointerEvent}
          >
            <div className="home-hp-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="home-hp-modal-header">
                <div className="home-hp-modal-title">{activePump.name}</div>
                <button
                  type="button"
                  className="home-hp-modal-close"
                  onClick={() => setActivePump(null)}
                  aria-label={HEAT_PUMP_OVERVIEW_TEXT.CLOSE}
                >
                  {'脳'}
                </button>
              </div>

              <div className="home-hp-modal-body">
                <div className={`home-hp-modal-status is-${activePump.status}`}>
                  <img
                    src={HEAT_PUMP_MODAL_ICON_MAP[activePump.status] || HEAT_PUMP_ICON_MAP[activePump.status]}
                    alt=""
                    aria-hidden="true"
                    className="home-hp-modal-status-icon"
                  />
                  <span>{HEAT_PUMP_STATUS_LABEL[activePump.status]}</span>
                </div>

                <div className="home-hp-modal-metrics">
                  {activePump.details.map((metric) => (
                    <div key={`${activePump.key}-${metric.label}`} className="home-hp-modal-metric">
                      <span className="home-hp-modal-metric-label">{metric.label}</span>
                      <span className="home-hp-modal-metric-value">{metric.value}</span>
                    </div>
                  ))}
                </div>

                <button type="button" className="home-hp-modal-action" onClick={() => setActivePump(null)}>
                  {HEAT_PUMP_OVERVIEW_TEXT.CLOSE}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
        : null}

      {isOverviewModalOpen
        ? createPortal(
          <div
            className="home-hp-modal-backdrop"
            onClick={closeOverviewModal}
            onPointerDown={stopPointerEvent}
            onPointerMove={stopPointerEvent}
            onPointerUp={stopPointerEvent}
            onPointerCancel={stopPointerEvent}
          >
            <div
              className="home-hp-summary-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="home-hp-modal-header">
                <div className="home-hp-modal-title">{HEAT_PUMP_OVERVIEW_TEXT.TITLE}</div>
                <button
                  type="button"
                  className="home-hp-modal-close"
                  onClick={closeOverviewModal}
                  aria-label={HEAT_PUMP_OVERVIEW_TEXT.CLOSE}
                >
                  {'脳'}
                </button>
              </div>

              <div className="home-hp-summary-modal-body">
                <div className="home-hp-summary-table-wrap">
                  <table className="home-hp-summary-table">
                    <thead>
                      <tr>
                        <th>{HEAT_PUMP_OVERVIEW_TEXT.PUMP_NAME}</th>
                        <th>{HEAT_PUMP_OVERVIEW_TEXT.MODE_STATUS}</th>
                        {metricLabels.map((label) => (
                          <th key={`summary-head-${label}`}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedHeatPumps.map((pump) => {
                        const detailValueMap = new Map(
                          pump.details.map((detail) => [detail.label, detail.value]),
                        )
                        const modeStatusValue =
                          detailValueMap.get(HEAT_PUMP_DETAIL_LABEL.MODE_STATUS) ?? HEAT_PUMP_STATUS_LABEL[pump.status]

                        return (
                          <tr key={`summary-row-${pump.key}`}>
                            <td>{pump.name}</td>
                            <td>{modeStatusValue}</td>
                            {metricLabels.map((label) => (
                              <td key={`summary-cell-${pump.key}-${label}`}>{detailValueMap.get(label) ?? '--'}</td>
                            ))}
                          </tr>
                        )
                      })}

                      {Array.from({length: emptyRowCount}, (_, index) => (
                        <tr key={`summary-empty-row-${index}`} className="is-empty">
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                          {metricLabels.map((label) => (
                            <td key={`summary-empty-cell-${index}-${label}`}>&nbsp;</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
        : null}
    </>
  )
}

export default HomeHeatPumpOverview

