import { useMemo, useState } from 'react'
import useActionConfirm from '../hooks/useActionConfirm'
import './OperationsSystemManagementPage.css'

const TABLE_COLUMNS = ['设备名称', '累计运行时长（h）', '健康状况', '操作']
const PAGE_SIZE = 10

function createHeatPumpRows(count) {
  return Array.from({ length: count }, (_, index) => {
    const pumpNumber = index + 1
    const runtime = 96 + ((pumpNumber * 7) % 58)
    const health = pumpNumber % 6 === 0 ? '运行过长，请检修' : '正常'

    return {
      id: `heat-pump-${pumpNumber}`,
      name: `热泵${pumpNumber}`,
      runtime,
      health,
    }
  })
}

function createLoopPumpRows(count) {
  return Array.from({ length: count }, (_, index) => {
    const pumpNumber = index + 1
    const runtime = 108 + pumpNumber * 12
    const health = pumpNumber === 2 ? '运行过长，请检修' : '正常'

    return {
      id: `loop-pump-${pumpNumber}`,
      name: `热泵循环泵${pumpNumber}`,
      runtime,
      health,
    }
  })
}

function createCouplingRows() {
  return [
    {
      id: 'coupling-1',
      name: '电锅炉1',
      runtime: 84,
      health: '正常',
    },
    {
      id: 'coupling-2',
      name: '电锅炉2',
      runtime: 91,
      health: '正常',
    },
  ]
}

function createInitialTableData() {
  return {
    'ops-heat-pump': createHeatPumpRows(33),
    'ops-loop-pump': createLoopPumpRows(3),
    'ops-coupling': createCouplingRows(),
  }
}

function cloneTableData(tableData) {
  return Object.fromEntries(
    Object.entries(tableData).map(([key, rows]) => [
      key,
      rows.map((row) => ({
        ...row,
      })),
    ]),
  )
}

let tableDataStore = createInitialTableData()

function OperationsDeviceManagementPage({ tabId }) {
  const [currentPageByTab, setCurrentPageByTab] = useState({})
  const [tableData, setTableData] = useState(() => cloneTableData(tableDataStore))
  const { requestConfirm, confirmModal } = useActionConfirm()
  const rows = useMemo(() => tableData[tabId] ?? [], [tabId, tableData])
  const isEmpty = rows.length === 0
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(currentPageByTab[tabId] ?? 1, totalPages)
  const pageRows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return rows.slice(startIndex, startIndex + PAGE_SIZE)
  }, [currentPage, rows])

  const updateCurrentPage = (updater) => {
    setCurrentPageByTab((previous) => {
      const previousPage = previous[tabId] ?? 1
      const nextPage = typeof updater === 'function' ? updater(previousPage) : updater

      return {
        ...previous,
        [tabId]: Math.max(1, Math.min(totalPages, nextPage)),
      }
    })
  }

  const handleResetRuntime = (rowId) => {
    const currentRow = rows.find((row) => row.id === rowId)
    if (!currentRow) {
      return
    }

    requestConfirm(
      {
        title: '二次确认',
        message: `确认将${currentRow.name}的累计运行时长清零吗？`,
        confirmText: '确定',
        cancelText: '取消',
      },
      () => {
        setTableData((previous) => {
          const nextTableData = Object.fromEntries(
            Object.entries(previous).map(([key, currentRows]) => [
              key,
              currentRows.map((row) => (row.id === rowId ? { ...row, runtime: 0 } : row)),
            ]),
          )

          tableDataStore = cloneTableData(nextTableData)
          return nextTableData
        })
      },
    )
  }

  return (
    <>
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
              pageRows.map((row) => (
                <div key={row.id} className="ops-device-table__row">
                  <div>{row.name}</div>
                  <div>{row.runtime}</div>
                  <div>{row.health}</div>
                  <div>
                    <button type="button" onClick={() => handleResetRuntime(row.id)}>
                      时长清零
                    </button>
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
              onClick={() => updateCurrentPage((previous) => previous - 1)}
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
              onClick={() => updateCurrentPage((previous) => previous + 1)}
            >
              下一页
            </button>
          </div>
        ) : null}
      </main>

      {confirmModal}
    </>
  )
}

export default OperationsDeviceManagementPage
