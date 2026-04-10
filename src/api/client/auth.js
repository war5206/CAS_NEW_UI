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

const RSA_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkwlRoPQk/0JnDPi+ZG4e' +
  'Txq6Y5wkD4ZBFIlevwk8pB8VmSQBHrwbDYiCs1LZrleg4pxRbStrB4VFd0g5WtLgR' +
  'JpikC1yI7Wig/jLHIFB3YMRnLGMYdA687RtKgJZJKfFvubQa/w6qToisSo/tPE6t/' +
  '22e87F3H9Y//sYAWBvD0vyW6Wo+aNcIl+QVO7x8J5ng2J2C69Fhy+fZXf/4WREaMG' +
  'vAxU/MvR1d2Kyv9qytEHMbzEAw7JSEKwtLjDfgxecnWud4t3RSjUsrG7wiuEdD8eM' +
  'YVhY9mR0FGmgSTdlExz2AX4uJZxiBpE37LkHblBZNflA9JjbqQKQA29NElT+JQID' +
  'AQAB'

let _jsEncryptModule = null

function getJSEncrypt() {
  if (!_jsEncryptModule) {
    _jsEncryptModule = import('jsencrypt')
  }
  return _jsEncryptModule
}

export async function encryptPasswordAsync(password) {
  const { JSEncrypt } = await getJSEncrypt()
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(RSA_PUBLIC_KEY)
  const encrypted = encryptor.encrypt(password)
  if (!encrypted) {
    throw new Error('RSA encryption failed')
  }
  return encrypted
}

/** @deprecated Use encryptPasswordAsync instead */
export function encryptPassword(password) {
  return password
}
