import { useEffect, useMemo, useState } from 'react'
import './OperationsSystemManagementPage.css'

const TABLE_COLUMNS = ['设备名称', '累计运行时长（h）', '健康状况', '操作']
const PAGE_SIZE = 10

function createHeatPumpRows(count) {
  return Array.from({ length: count }, (_, index) => {
    const pumpNumber = index + 1
    const runtime = 96 + ((pumpNumber * 7) % 58)
    const health = pumpNumber % 6 === 0 ? '运行过长，请维检' : '正常'
    return [`热泵${pumpNumber}`, `${runtime}`, health]
  })
}

function createLoopPumpRows(count) {
  return Array.from({ length: count }, (_, index) => {
    const pumpNumber = index + 1
    const runtime = 108 + pumpNumber * 12
    const health = pumpNumber === 2 ? '运行过长，请维检' : '正常'
    return [`热泵循环泵${pumpNumber}`, `${runtime}`, health]
  })
}

const TABLE_DATA = {
  'ops-heat-pump': createHeatPumpRows(33),
  'ops-loop-pump': createLoopPumpRows(3),
  'ops-coupling': [],
}

function OperationsDeviceManagementPage({ tabId }) {
  const [currentPage, setCurrentPage] = useState(1)
  const rows = TABLE_DATA[tabId] ?? []
  const isEmpty = rows.length === 0
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return rows.slice(startIndex, startIndex + PAGE_SIZE)
  }, [currentPage, rows])

  useEffect(() => {
    setCurrentPage(1)
  }, [tabId])

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, totalPages))
  }, [totalPages])

  return (
    <main className="ops-device-page">
      <div className="ops-device-table">
        <div className="ops-device-table__head">
          {TABLE_COLUMNS.map((column) => (
            <div key={column}>{column}</div>
          ))}
        </div>

        <div className="ops-device-table__body">
          {isEmpty ? (
            <div className="ops-device-table__row">
              <div>暂无</div>
              <div>暂无</div>
              <div>暂无</div>
              <div>暂无</div>
            </div>
          ) : (
            pageRows.map((row, index) => (
              <div key={`${row[0]}-${index}`} className="ops-device-table__row">
                <div>{row[0]}</div>
                <div>{row[1]}</div>
                <div>{row[2]}</div>
                <div>
                  <button type="button">时长清零</button>
                </div>
              </div>
            ))
          )}

          {Array.from({ length: Math.max(0, 7 - Math.max(rows.length, isEmpty ? 1 : 0)) }).map((_, index) => (
            <div key={`empty-${index}`} className="ops-device-table__row is-empty">
              <div />
              <div />
              <div />
              <div />
            </div>
          ))}
        </div>
      </div>

      {!isEmpty ? (
        <div className="ops-device-pagination">
          <button
            type="button"
            className="ops-device-pagination__button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
          >
            上一页
          </button>
          <span className="ops-device-pagination__info">
            第 {currentPage} / {totalPages} 页
          </span>
          <button
            type="button"
            className="ops-device-pagination__button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
          >
            下一页
          </button>
        </div>
      ) : null}
    </main>
  )
}

export default OperationsDeviceManagementPage
