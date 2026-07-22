/**
 * 统一拦截算法过程接口，根据 algorithmProcessId 返回 mock 数据。
 * 适用于 VITE_SKIP_INIT_GATE=true 的 E2E 场景。
 */

const ALGORITHM_PROCESS_URL = '**/FinforWorx/algorithm/process/execute*'

export function createApiResponse(body) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      code: '200',
      success: true,
      msg: 'success',
      data: body,
    }),
  }
}

export async function mockAlgorithmProcess(page, handlers = {}) {
  await page.route(ALGORITHM_PROCESS_URL, async (route, request) => {
    const postData = request.postData()
    let payload = {}
    try {
      payload = JSON.parse(postData || '{}')
    } catch {
      payload = {}
    }

    const algorithmProcessId = payload?.algorithmProcessId
    const handler = handlers[algorithmProcessId]

    if (typeof handler === 'function') {
      const responseBody = await handler(payload)
      return route.fulfill(createApiResponse(responseBody))
    }

    if (handler !== undefined) {
      return route.fulfill(createApiResponse(handler))
    }

    // 未命中 handler 时返回一个空的成功响应，避免前端报错阻塞
    return route.fulfill(createApiResponse({}))
  })
}

export const MOCK_API_HANDLERS = {
  queryRealvalByLongNames: {
    'Sys\\FinforWorx\\SystemOperatingMode': 0,
    'Sys\\FinforWorx\\HPTotalRunMode': 1,
    'Sys\\FinforWorx\\QHBC': 1,
    'Sys\\FinforWorx\\ZNDS': 1,
    'Sys\\FinforWorx\\GFTJ': 1,
    'Sys\\FinforWorx\\OHNY': 1,
    'Sys\\FinforWorx\\Function1': 1,
  },
  writeRealvalByLongNames: { state: 'success' },
  hpRunModeSwitch: { state: 'success' },
  setOperationPassword: { state: 'success' },
}
