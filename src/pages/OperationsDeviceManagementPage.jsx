import { useEffect, useMemo, useState } from 'react'
import useActionConfirm from '../hooks/useActionConfirm'
import { writeRealvalByLongNames } from '@/api/modules/settings'
import { useOpsOperatingTimeQuery, useOpsSystemTypeQuery } from '@/features/operations/hooks/useOperationsQueries'
import './OperationsSystemManagementPage.css'

const TABLE_COLUMNS = ['设备名称', '累计运行时长（h）', '健康状况', '操作']
const PAGE_SIZE = 10
const OPS_SYSTEM_TYPE_STORAGE_KEY = 'ops.systemType'

const DEVICE_TYPE_MAP = {
  'ops-heat-pump': '热泵',
  'ops-loop-pump': '热泵循环泵',
  'ops-terminal-loop-pump': '末端循环泵',
  'ops-coupling': '耦合能源',
}

function OperationsDeviceManagementPage({ tabId }) {
  const [currentPageByTab, setCurrentPageByTab] = useState({})
  const { requestConfirm, confirmModal } = useActionConfirm()
  const deviceType = DEVICE_TYPE_MAP[tabId] ?? '热泵'
  const { data: systemType = '1' } = useOpsSystemTypeQuery()
  const { data: rows = [] } = useOpsOperatingTimeQuery(deviceType, { enabled: Boolean(deviceType) })

  useEffect(() => {
    window.localStorage.setItem(OPS_SYSTEM_TYPE_STORAGE_KEY, String(systemType))
    window.dispatchEvent(
      new CustomEvent('ops-system-type-change', {
        detail: String(systemType),
      }),
    )
  }, [systemType])

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
      async () => {
        if (!currentRow.zeroLongName) {
          return
        }
        const response = await writeRealvalByLongNames({
          [currentRow.zeroLongName]: 1,
        })
        const state = response?.data?.data?.state
        if (state !== 'success') {
          throw new Error('reset runtime failed')
        }
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
