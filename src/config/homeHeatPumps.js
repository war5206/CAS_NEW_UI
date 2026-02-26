// 热泵总览网格配置：按需修改行列数即可。
export const HEAT_PUMP_GRID_SIZE = {
  rows: 10,
  cols: 10,
}

const normalizeGridSize = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const HEAT_PUMP_GRID_ROWS = normalizeGridSize(HEAT_PUMP_GRID_SIZE.rows, 10)
export const HEAT_PUMP_GRID_COLS = normalizeGridSize(HEAT_PUMP_GRID_SIZE.cols, 10)

export const HEAT_PUMP_STATUS = {
  RUNNING: 'running',
  MALFUNCTION: 'malfunction',
  DEFROSTING: 'defrosting',
  SHUTDOWN: 'shutdown',
  EMPTY: 'empty',
}

export const HEAT_PUMP_STATUS_LABEL = {
  [HEAT_PUMP_STATUS.RUNNING]: '运行中',
  [HEAT_PUMP_STATUS.MALFUNCTION]: '故障',
  [HEAT_PUMP_STATUS.DEFROSTING]: '化霜中',
  [HEAT_PUMP_STATUS.SHUTDOWN]: '待机',
  [HEAT_PUMP_STATUS.EMPTY]: '无设备',
}

export const HEAT_PUMP_DETAIL_LABEL = {
  INLET_TEMP: '进水温度（℃）',
  OUTLET_TEMP: '出水温度（℃）',
  AMBIENT_TEMP: '环境温度（℃）',
  CUMULATIVE_RUNTIME: '累积运行时长（h）',
  CONTINUOUS_RUNTIME: '持续运行时长（h）',
  COMPRESSOR_1_CURRENT: '压缩机1电流（A）',
  COMPRESSOR_2_CURRENT: '压缩机2电流（A）',
  ANTI_FREEZE_STATUS: '防冻状态',
  MODE_STATUS: '模式状态',
  DEFROST_STATUS: '化霜状态',
  FAULT_STATUS: '故障状态',
}

const BASE_DETAILS = [
  {label: HEAT_PUMP_DETAIL_LABEL.INLET_TEMP, value: '20'},
  {label: HEAT_PUMP_DETAIL_LABEL.OUTLET_TEMP, value: '20'},
  {label: HEAT_PUMP_DETAIL_LABEL.AMBIENT_TEMP, value: '20'},
  {label: HEAT_PUMP_DETAIL_LABEL.CUMULATIVE_RUNTIME, value: '20'},
  {label: HEAT_PUMP_DETAIL_LABEL.CONTINUOUS_RUNTIME, value: '20'},
  {label: HEAT_PUMP_DETAIL_LABEL.COMPRESSOR_1_CURRENT, value: '0.38'},
  {label: HEAT_PUMP_DETAIL_LABEL.COMPRESSOR_2_CURRENT, value: '0.38'},
  {label: HEAT_PUMP_DETAIL_LABEL.ANTI_FREEZE_STATUS, value: '开'},
  {label: HEAT_PUMP_DETAIL_LABEL.MODE_STATUS, value: '制热'},
  {label: HEAT_PUMP_DETAIL_LABEL.DEFROST_STATUS, value: '关'},
  {label: HEAT_PUMP_DETAIL_LABEL.FAULT_STATUS, value: '关'},
]

const setDetailValue = (details, label, value) =>
  details.map((item) => (item.label === label ? {...item, value} : item))

const getDefaultDetailsByStatus = (status, id) => {
  let details = BASE_DETAILS.map((item) => ({...item}))

  if (status === HEAT_PUMP_STATUS.MALFUNCTION) {
    const modeValue = id === 10 ? '故障' : '故障'
    details = setDetailValue(details, HEAT_PUMP_DETAIL_LABEL.MODE_STATUS, modeValue)
    details = setDetailValue(details, HEAT_PUMP_DETAIL_LABEL.FAULT_STATUS, '开')
    return details
  }

  if (status === HEAT_PUMP_STATUS.DEFROSTING) {
    details = setDetailValue(details, HEAT_PUMP_DETAIL_LABEL.MODE_STATUS, '化霜')
    details = setDetailValue(details, HEAT_PUMP_DETAIL_LABEL.DEFROST_STATUS, '开')
    return details
  }

  if (status === HEAT_PUMP_STATUS.SHUTDOWN) {
    details = setDetailValue(details, HEAT_PUMP_DETAIL_LABEL.MODE_STATUS, '待机')
    details = setDetailValue(details, HEAT_PUMP_DETAIL_LABEL.CONTINUOUS_RUNTIME, '0')
    details = setDetailValue(details, HEAT_PUMP_DETAIL_LABEL.ANTI_FREEZE_STATUS, '关')
    return details
  }

  return details
}

const PUMP_ITEMS = [
  {id: 1, row: 1, col: 1, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 2, row: 1, col: 2, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 3, row: 1, col: 3, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 4, row: 1, col: 4, status: HEAT_PUMP_STATUS.DEFROSTING},
  {id: 5, row: 1, col: 5, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 6, row: 1, col: 6, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 7, row: 1, col: 7, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 8, row: 1, col: 8, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 9, row: 1, col: 9, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 10, row: 1, col: 10, status: HEAT_PUMP_STATUS.MALFUNCTION},
  {id: 11, row: 2, col: 1, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 12, row: 2, col: 2, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 13, row: 2, col: 3, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 14, row: 2, col: 4, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 15, row: 2, col: 5, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 16, row: 2, col: 6, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 17, row: 2, col: 7, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 18, row: 3, col: 1, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 19, row: 3, col: 2, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 20, row: 3, col: 3, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 21, row: 3, col: 4, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 22, row: 3, col: 5, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 23, row: 3, col: 6, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 24, row: 3, col: 7, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 25, row: 3, col: 8, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 26, row: 4, col: 1, status: HEAT_PUMP_STATUS.RUNNING},
  {id: 27, row: 4, col: 2, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 28, row: 4, col: 3, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 29, row: 4, col: 4, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 30, row: 4, col: 5, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 31, row: 4, col: 6, status: HEAT_PUMP_STATUS.SHUTDOWN},
  {id: 32, row: 5, col: 1, status: HEAT_PUMP_STATUS.MALFUNCTION},
  {id: 33, row: 5, col: 2, status: HEAT_PUMP_STATUS.DEFROSTING},
]

const PUMP_ITEMS_BY_POSITION = new Map(
  PUMP_ITEMS.map((item) => {
    const key = `${item.row}-${item.col}`
    const details = getDefaultDetailsByStatus(item.status, item.id)

    return [
      key,
      {
        ...item,
        key: `hp-${item.id}`,
        label: String(item.id).padStart(2, '0'),
        name: `热泵${item.id}`,
        details,
      },
    ]
  }),
)

export const HEAT_PUMP_GRID_ITEMS = Array.from({length: HEAT_PUMP_GRID_ROWS * HEAT_PUMP_GRID_COLS}, (_, index) => {
  const row = Math.floor(index / HEAT_PUMP_GRID_COLS) + 1
  const col = (index % HEAT_PUMP_GRID_COLS) + 1
  const key = `${row}-${col}`
  const item = PUMP_ITEMS_BY_POSITION.get(key)

  if (item) {
    return item
  }

  return {
    key: `hp-empty-${row}-${col}`,
    id: null,
    row,
    col,
    status: HEAT_PUMP_STATUS.EMPTY,
    label: null,
    name: null,
    details: [],
  }
})

export const getHeatPumpStatusSummary = (items = HEAT_PUMP_GRID_ITEMS) =>
  items.reduce(
    (summary, item) => {
      if (item.status === HEAT_PUMP_STATUS.RUNNING) {
        summary.running += 1
      } else if (item.status === HEAT_PUMP_STATUS.SHUTDOWN) {
        summary.shutdown += 1
      } else if (item.status === HEAT_PUMP_STATUS.DEFROSTING) {
        summary.defrosting += 1
      } else if (item.status === HEAT_PUMP_STATUS.MALFUNCTION) {
        summary.malfunction += 1
      }

      return summary
    },
    {
      running: 0,
      shutdown: 0,
      defrosting: 0,
      malfunction: 0,
    },
  )

export const HEAT_PUMP_STATUS_SUMMARY = getHeatPumpStatusSummary()
