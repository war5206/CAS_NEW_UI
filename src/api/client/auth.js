const TOKEN_STORAGE_KEY = 'token'

export function getStoredToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || ''
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
