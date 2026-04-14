# CAS-NEW-UI API 分层架构参考

## 数据流全景

```
用户访问页面
    │
    ▼
src/pages/Xxx.jsx          ← 消费 hook 返回的数据渲染 UI
    │ 调用
    ▼
src/features/xx/hooks/     ← createDataQuery 封装（轮询 + 缓存 + 兜底）
    │ queryFn + select
    ▼                          ▼
src/api/modules/xx.js      src/api/adapters/xx.js
    │ callAlgorithmProcess      │ adaptXxx(rawData) 映射后端 → 前端
    ▼                          
src/api/client/http.js     ← POST 请求
    │
    ▼
src/api/client/config.js   ← algorithmProcessId 常量 + API 地址
```

## 关键文件位置

| 层级 | 路径 | 职责 |
|------|------|------|
| 常量注册 | `src/api/client/config.js` | `ALGORITHM_PROCESS_IDS` 对象 |
| HTTP 客户端 | `src/api/client/http.js` | `post(url, body, options)` |
| API 调用 | `src/api/modules/*.js` | 每个业务模块的请求函数 |
| 数据适配 | `src/api/adapters/*.js` | 后端扁平数据 → 前端嵌套结构 |
| Hook 封装 | `src/features/*/hooks/*.js` | `createDataQuery` 轮询 hook |
| 页面 | `src/pages/*.jsx` | 消费 hook 数据渲染 |

## 统一请求格式

所有后端调用通过 `callAlgorithmProcess` 发起：

```javascript
// src/api/modules/home.js
async function callAlgorithmProcess(algorithmProcessId, paramData = {}) {
  return post(getAlgorithmProcessPath(), {
    algorithmProcessId,
    param: {
      data: paramData
    }
  }, {
    baseUrl: getApiBaseUrl(),
    timeout: 10_000,
  })
}
```

返回结构：`{ status, data: { code, data, msg, success }, headers }`

## 适配函数模板

### 工具函数（可直接复用或重新定义）

```javascript
function toNumberOrFallback(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toText(value, fallback) {
  if (value == null || value === '') return fallback
  return String(value)
}

function toBoolean(value, fallback) {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return fallback
}
```

### 适配函数骨架

```javascript
// src/api/adapters/xxx.js

export function createDefaultXxxData() {
  return {
    // 前端组件所需的完整默认数据结构
    // 作为接口异常时的兜底值
    fieldA: '默认值',
    fieldB: 0,
    listC: [],
  }
}

export function adaptXxxData(rawData) {
  const fallback = createDefaultXxxData()
  // 解包统一响应结构
  const responseData = rawData?.data ?? rawData
  const source = responseData?.data ?? responseData ?? {}

  return {
    fieldA: toText(source.backendFieldA, fallback.fieldA),
    fieldB: toNumberOrFallback(source.backendFieldB, fallback.fieldB),
    listC: Array.isArray(source.backendListC)
      ? source.backendListC.map((item) => ({
          name: item.name,
          value: toText(item.value, '0'),
        }))
      : fallback.listC,
  }
}
```

### Hook 骨架

```javascript
// src/features/xxx/hooks/useXxxQuery.js

import { createDataQuery } from '@/shared/hooks/createDataQuery'
import { adaptXxxData, createDefaultXxxData } from '@/api/adapters/xxx'
import { getXxxData } from '@/api/modules/xxx'

export const useXxxQuery = createDataQuery({
  queryKey: ['xxx-data'],
  queryFn: getXxxData,
  select: (response) => adaptXxxData(response?.data ?? response),
  createDefaultData: createDefaultXxxData,
})
```

`createDataQuery` 内部行为：
- 每 10 秒自动轮询（`refetchInterval: 10_000`）
- 缓存上次成功数据（`lastSuccessRef`）
- 接口异常时返回 `createDefaultData()` 兜底

## 首页改造范例

以下是首页（HomePage）从静态改为动态的完整参考。

### 后端响应（扁平结构）

```json
{
  "code": 200,
  "data": {
    "onlineHeatPump": "2",
    "offlineHeatPump": 10,
    "defrostHeatPump": 0,
    "alarmHeatPump": 0,
    "tropicalCompanion": 1,
    "coupleEnergy": 0,
    "pressureReliefValve": 0,
    "dirtSeparator": 0,
    "heatCirculationPump": [
      { "name": "水泵1", "state": "运行" },
      { "name": "水泵2", "state": "待机" }
    ],
    "replenishWaterPump1": "待机",
    "replenishWaterPump2": "待机",
    "ambientTemperature": 0,
    "condensateWaterTemperature": 0,
    "userSupplyWaterTemperature": 0,
    "userBackWaterTemperature": 0,
    "supplyWaterPressure": 100,
    "backWaterPressure": 200,
    "softenWaterTank": 0,
    "terminalTemperature": [
      { "name": "室内温度1", "value": "0.0" }
    ],
    "optional": {
      "targetBackwaterTemperature": "0.0℃",
      "modeColdHeat": "制热模式"
    }
  }
}
```

### 适配映射（后端字段 → 前端字段）

| 后端字段 | 前端字段 | 转换方式 |
|----------|----------|----------|
| `onlineHeatPump` | `heatPumpSummary.running` | `toNumberOrFallback` |
| `offlineHeatPump` | `heatPumpSummary.shutdown` | `toNumberOrFallback` |
| `defrostHeatPump` | `heatPumpSummary.defrosting` | `toNumberOrFallback` |
| `alarmHeatPump` | `heatPumpSummary.malfunction` | `toNumberOrFallback` |
| `tropicalCompanion` | `heatTracingEnabled` | `toBoolean`（1=true, 0=false） |
| `coupleEnergy` | `couplingEnergyEnabled` | `toBoolean` |
| `pressureReliefValve` | `pressureValveOpen` | `toBoolean` |
| `dirtSeparator` | `drainValveOpen` | `toBoolean` |
| `heatCirculationPump[]` | `circulationPumps[]` | 数组 map，state → tone/status |
| `replenishWaterPump1/2` | `makeupPumps[]` | `pumpStateToPumpItem` |
| `ambientTemperature` | `outdoorTemp` | `toText` |
| `condensateWaterTemperature` | `condensatePipeTemp` | `toText` |
| `userSupplyWaterTemperature` | `supplyTemp` | `toText` |
| `userBackWaterTemperature` | `returnTemp` | `toText` |
| `supplyWaterPressure` | `supplyPressure` | `toText` |
| `backWaterPressure` | `returnPressure` | `toText` |
| `softenWaterTank` | `waterTankLevel` | `toText` |
| `terminalTemperature[]` | `indoorTemperatures[]` | 数组 map |
| `optional.targetBackwaterTemperature` | `targetBackwaterTemperature` | `toText` |

### 泵状态转换模式

后端返回中文状态文字，前端需要 `{ name, status, tone }` 三元组：

```javascript
function pumpStateToPumpItem(name, stateText) {
  const normalized = String(stateText || '').trim()
  let tone = 'off'
  let status = '待机'
  if (normalized === '运行' || normalized === '开启') {
    tone = 'running'
    status = '运行中'
  } else if (normalized === '报警' || normalized === '故障') {
    tone = 'fault'
    status = '有故障'
  }
  return { name, status, tone }
}
```

### 多系统格式检测

后端可能根据系统类型（一次系统/二次系统）返回不同字段。用特征字段检测：

```javascript
const isSecondarySystem = source.terminalCirculationPump !== undefined
  || source.onceSupplyWaterTemperature !== undefined
```

二次系统额外字段：`terminalCirculationPump`（末端循环泵）、`onceSupplyWaterTemperature`（一次侧供水总管温度）。

### 页面替换模式

静态值替换：

```jsx
// 之前（静态）
<span className="home-system-value">-2.1</span>

// 之后（动态）
<span className="home-system-value">{homeOverview.system.outdoorTemp}</span>
```

数组动态渲染：

```jsx
// 之前（静态列表）
{[1, 2, 3].map((i) => (
  <div key={i}>室内温度{i}: 0.0℃</div>
))}

// 之后（动态数组）
{indoorTemperatures.map((item, index) => (
  <div key={index}>
    <span>{item.name}</span>
    <span>{item.value}</span>
    <span>℃</span>
  </div>
))}
```

条件展示（仅二次系统显示）：

```jsx
{primarySupplyMainTemp !== '' && (
  <div>
    <span>一次侧供水总管温度</span>
    <span>{primarySupplyMainTemp}</span>
    <span>℃</span>
  </div>
)}
```
