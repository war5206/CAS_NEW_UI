import { getStoredToken } from './auth'

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function request(url, options = {}) {
  const {
    baseUrl = '',
    method = 'GET',
    headers,
    body,
    token = getStoredToken(),
    timeout = 15_000,
    signal,
    ...rest
  } = options

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeout)
  const requestSignal = signal ?? controller.signal
  const resolvedHeaders = new Headers(headers || {})

  if (!resolvedHeaders.has('Content-Type') && body != null && !(body instanceof FormData)) {
    resolvedHeaders.set('Content-Type', 'application/json')
  }

  if (token && !resolvedHeaders.has('token')) {
    resolvedHeaders.set('token', token)
  }

  try {
    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers: resolvedHeaders,
      body,
      signal: requestSignal,
      ...rest,
    })

    const data = await parseResponseBody(response)

    if (!response.ok) {
      const error = new Error(`Request failed with status ${response.status}`)
      error.status = response.status
      error.data = data
      throw error
    }

    return {
      status: response.status,
      data,
      headers: response.headers,
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function get(url, options) {
  return request(url, {
    ...options,
    method: 'GET',
  })
}

export function post(url, body, options) {
  const resolvedBody =
    body == null || body instanceof FormData || typeof body === 'string' ? body : JSON.stringify(body)

  return request(url, {
    ...options,
    method: 'POST',
    body: resolvedBody,
  })
}
