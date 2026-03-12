import './OperationsSystemManagementPage.css'

const TABLE_COLUMNS = ['设备名称', '累计运行时长（h）', '健康状况', '操作']

const TABLE_DATA = {
  'ops-heat-pump': [
    ['热泵1', '120', '正常'],
    ['热泵2', '130', '运行过长，请维检'],
    ['热泵1', '120', '正常'],
    ['热泵2', '130', '运行过长，请维检'],
    ['热泵1', '120', '正常'],
    ['热泵2', '130', '运行过长，请维检'],
  ],
  'ops-loop-pump': [
    ['热泵循环泵1', '120', '正常'],
    ['热泵循环泵2', '130', '运行过长，请维检'],
  ],
  'ops-coupling': [
    ['热泵循环泵1', '120', '正常'],
    ['热泵循环泵2', '130', '运行过长，请维检'],
  ],
}

function OperationsDeviceManagementPage({ tabId }) {
  const rows = TABLE_DATA[tabId] ?? []

  return (
    <main className="ops-device-page">
      <div className="ops-device-table">
        <div className="ops-device-table__head">
          {TABLE_COLUMNS.map((column) => (
            <div key={column}>{column}</div>
          ))}
        </div>

        <div className="ops-device-table__body">
          {rows.map((row, index) => (
            <div key={`${row[0]}-${index}`} className="ops-device-table__row">
              <div>{row[0]}</div>
              <div>{row[1]}</div>
              <div>{row[2]}</div>
              <div>
                <button type="button">时长清零</button>
              </div>
            </div>
          ))}

          {Array.from({ length: Math.max(0, 7 - rows.length) }).map((_, index) => (
            <div key={`empty-${index}`} className="ops-device-table__row is-empty">
              <div />
              <div />
              <div />
              <div />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default OperationsDeviceManagementPage
