const TOKEN_STORAGE_KEY = 'token'
// 用于测试的硬编码 token，实际应从登录获取
const TEST_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJsb2dpblR5cGUiOiJsb2dpbiIsImxvZ2luSWQiOiIxMDEwMTAxMDEwIiwiZGV2aWNlIjoiZXh0IiwiZWZmIjoxNzc0MjYxOTg0NTQ1LCJyblN0ciI6IkdkTVlLM0RsTmNwUEpJWnUzTHFGU0xVRG03bHh0OUpvIiwiZGJUeXBlIjoibXlzcWwiLCJkYkNvZGUiOiJiYXNlIiwidXNlclV1aWQiOiIxMDEwMTAxMDEwIiwidXNlck5hbWUiOiJhZG1pbiIsInBhc3N3b3JkIjoiIiwibmljZU5hbWUiOiLotoXnuqfnrqHnkIblkZgiLCJlbWFpbCI6IjEyM0BxcS5jb20iLCJtb2JpbGUiOiIxNTg4ODg4ODg4OCIsInNleCI6IuWlsyIsImFnZSI6IiIsImFkbWluZWQiOiIxIiwiZW5hYmxlZCI6IjEiLCJlbmFibGVkRXh0IjoiMSIsImltYWdlIjoiMCIsImNyZWF0ZVRpbWUiOiIyMDI0LTA0LTAzIDEwOjEwOjEwIiwiY29tcGFueUlkIjoiYmFzZSIsImRpbmd0YWxrVXNlcklkIjoiIiwidGVsIjoiIiwiaW1hZ2VCYXNlNjQiOiIiLCJwd2RVcGRhdGVUaW1lIjoiMjAyNC0wNC0wMyAxMDoxMDoxMCIsImxvZ2luRmFpbFRpbWUiOiIiLCJsb2dpblN1Y2Nlc3NUaW1lIjoiMjAyNi0wMy0yMCAxNTo1MDoxMSJ9.1nkWddD_DSwlCmEwVOW83JkQI4htPGhImI-z5xTqUHA'

export function getStoredToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || TEST_TOKEN
}

export function setStoredToken(token) {
  if (typeof window === 'undefined') {
    return
  }

  if (token) {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
    return
  }

  window.sessionStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function clearStoredToken() {
  setStoredToken('')
}

export function parseUserFromToken(token) {
  try {
    const parts = String(token || '').split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = window.atob(payload)
    return JSON.parse(decoded)
  } catch (error) {
    console.error('Failed to parse token payload.', error)
    return null
  }
}

export function encryptPassword(password) {
  // Placeholder: replace with real RSA encryption when the backend contract is finalized.
  return password
}
