---
name: static-to-dynamic
description: >-
  将 CAS-NEW-UI 页面中的静态硬编码数据改为后端接口动态数据。通过需求文档驱动，
  自动完成 API 注册、适配器编写、Hook 封装、页面渲染替换的全流程。
  触发词：静态改动态、静态数据改为动态数据、连接后端接口、把XX页面接入后端API。
---

# 静态数据改为动态数据

将页面中的硬编码静态数据替换为从后端 `algorithmProcess` 接口获取的动态数据。

## 前置条件

用户需提供一个需求文档（通常位于 `prompts/` 目录），文档中包含：
- 后端 `algorithmProcessId`
- 请求 payload 格式
- 响应 JSON 结构
- 后端字段与前端展示的映射关系

## 工作流

### Step 1 — 解析需求文档

读取用户提供的需求文档，提取以下信息：

1. **algorithmProcessId** — 后端接口标识
2. **payload** — 请求体结构（通常为 `{ algorithmProcessId, param: { data: {} } }`）
3. **responseData** — 响应数据的 JSON 结构和全部字段
4. **字段映射** — 后端字段名 → 前端页面展示位置的对应关系

### Step 2 — 注册 algorithmProcessId

在 `src/api/client/config.js` 的 `ALGORITHM_PROCESS_IDS` 对象中添加新常量：

```javascript
export const ALGORITHM_PROCESS_IDS = {
  // ... 已有的 ID
  YOUR_NEW_ID: 'yourAlgorithmProcessId',
}
```

命名规则：使用 UPPER_SNAKE_CASE，语义清晰。

### Step 3 — 添加 API 调用函数

在 `src/api/modules/` 中添加调用函数。如果该页面已有对应 module 文件则复用，否则新建。

```javascript
export async function getYourPageData() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.YOUR_NEW_ID, {})
}
```

注意：API 函数只负责发请求并返回原始响应，不在此处做数据适配。适配逻辑统一放在 adapter 中，由 hook 的 `select` 调用。

### Step 4 — 编写数据适配函数

在 `src/api/adapters/` 中编写适配函数。这是最核心的步骤。

**必须遵循的模式：**

1. 编写 `createDefaultXxx()` — 返回前端组件所需的完整默认数据结构（接口异常时的兜底数据）
2. 编写 `adaptXxx(rawData)` — 将后端扁平响应映射为前端嵌套结构
3. 复用工具函数处理类型安全转换：

| 函数 | 用途 |
|------|------|
| `toText(value, fallback)` | 转字符串，null/空返回 fallback |
| `toNumberOrFallback(value, fallback)` | 转数字，非法值返回 fallback |
| `toBoolean(value, fallback)` | 转布尔，支持 0/1/"true"/"false" |

4. 后端返回 0/1 表示开关的字段，用 `toBoolean` 转换
5. 后端返回数组（如泵列表），逐项映射为 `{ name, status, tone }` 格式
6. 处理统一返回结构：`rawData` 可能是 `{ code, data, msg }` 嵌套，需用 `rawData?.data ?? rawData` 解包

详细模板和范例见 [architecture.md](architecture.md)。

### Step 5 — 创建 Query Hook

在 `src/features/<模块>/hooks/` 中创建 hook 文件：

```javascript
import { createDataQuery } from '@/shared/hooks/createDataQuery'
import { adaptXxx, createDefaultXxx } from '@/api/adapters/xxx'
import { getYourPageData } from '@/api/modules/xxx'

export const useXxxQuery = createDataQuery({
  queryKey: ['your-query-key'],
  queryFn: getYourPageData,
  select: (response) => adaptXxx(response?.data ?? response),
  createDefaultData: createDefaultXxx,
})
```

`createDataQuery` 自动封装了 10 秒轮询、上次成功数据缓存、默认值兜底。

### Step 6 — 替换页面静态数据

在 `src/pages/Xxx.jsx` 中：

1. 导入新建的 hook
2. 调用 hook 获取数据：`const { data } = useXxxQuery({ enabled: isActive })`
3. 找到所有硬编码的静态值，替换为 `data.xxx` 动态值
4. 对于数组渲染（如泵列表），用 `.map()` 动态渲染替代硬编码列表
5. 对于条件展示的区域，用 `{value !== '' && (<div>...</div>)}` 模式

### Step 7 — 构建验证

运行 `npx vite build` 确认编译无错误。

## 注意事项

- **不要在 API module 和 hook 中重复适配**。适配只在 hook 的 `select` 中执行一次。
- **始终提供 fallback 默认值**。接口失败时页面应展示合理的默认状态，不能白屏。
- **后端可能有多种返回格式**（如一次系统/二次系统）。适配函数中用特征字段检测格式并分支处理。
- 如果需求文档中有"测试验证"要求，完成后在浏览器中调用接口确认数据正确展示。
