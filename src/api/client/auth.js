const TOKEN_STORAGE_KEY = 'token'

export function getStoredToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  // return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || ''
  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJsb2dpblR5cGUiOiJsb2dpbiIsImxvZ2luSWQiOiIxMDEwMTAxMDEwIiwiZGV2aWNlIjoiZXh0IiwiZWZmIjoxNzc1ODk2NjA1MjA5LCJyblN0ciI6IlFsaFFWekpJMFg3eXVqY2JmTjFVVTd6V1oxUXh0cDdUIiwiZGJUeXBlIjoibXlzcWwiLCJkYkNvZGUiOiJiYXNlIiwidXNlclV1aWQiOiIxMDEwMTAxMDEwIiwidXNlck5hbWUiOiJhZG1pbiIsInBhc3N3b3JkIjoiIiwibmljZU5hbWUiOiLotoXnuqfnrqHnkIblkZgiLCJlbWFpbCI6IjEyM0BxcS5jb20iLCJtb2JpbGUiOiIxNTg4ODg4ODg4OCIsInNleCI6IuWlsyIsImFnZSI6IiIsImFkbWluZWQiOiIxIiwiZW5hYmxlZCI6IjEiLCJlbmFibGVkRXh0IjoiMSIsImltYWdlIjoiMCIsImNyZWF0ZVRpbWUiOiIyMDI0LTA0LTAzIDEwOjEwOjEwIiwiY29tcGFueUlkIjoiYmFzZSIsImRpbmd0YWxrVXNlcklkIjoiIiwidGVsIjoiIiwiaW1hZ2VCYXNlNjQiOiIiLCJwd2RVcGRhdGVUaW1lIjoiMjAyNC0wNC0wMyAxMDoxMDoxMCIsImxvZ2luRmFpbFRpbWUiOiIiLCJsb2dpblN1Y2Nlc3NUaW1lIjoiMjAyNi0wNC0xMCAxNzo0MDo1OSJ9.Z0-vRHXo4zMtxAyfqETsiBDuEdDLM5c-9zs_L1MFNXM'
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
