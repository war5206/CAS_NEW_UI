import { useSyncExternalStore } from 'react'
import { normalizeUserRoleMessage } from '../userRole'

const listeners = new Set()
const USER_ROLE_STORAGE_KEY = 'cas.userRole'

function readPersistedUserRoleString() {
  if (typeof window === 'undefined') {
    return ''
  }
  try {
    return window.localStorage.getItem(USER_ROLE_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function persistUserRoleString(value) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    if (value) {
      window.localStorage.setItem(USER_ROLE_STORAGE_KEY, value)
    } else {
      window.localStorage.removeItem(USER_ROLE_STORAGE_KEY)
    }
  } catch {
    /* ignore */
  }
}

function initialUserRoleFromStorage() {
  const raw = readPersistedUserRoleString()
  if (raw === '') {
    return ''
  }
  return normalizeUserRoleMessage(raw)
}

let state = {
  // 设置的临时密码
  tempPassword: '',
  // 登录失败次数
  loginFailCount: 0,
  // 用户权限（登录成功且已持久化后为三值之一；清空后为 ''，显示层按运维受限处理）
  userRole: initialUserRoleFromStorage(),
  // 是否已设置密码
  hasSetPassword: false,
}

function emitChange() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

export function useAuthStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function setTempPassword(password) {
  state = {
    ...state,
    tempPassword: password,
    hasSetPassword: true,
  }
  emitChange()
}

export function clearTempPassword() {
  state = {
    ...state,
    tempPassword: '',
    hasSetPassword: false,
  }
  emitChange()
}

export function incrementLoginFailCount() {
  state = {
    ...state,
    loginFailCount: state.loginFailCount + 1,
  }
  emitChange()
}

export function resetLoginFailCount() {
  state = {
    ...state,
    loginFailCount: 0,
  }
  emitChange()
}

export function setUserRole(role) {
  const normalized = normalizeUserRoleMessage(role)
  state = {
    ...state,
    userRole: normalized,
  }
  persistUserRoleString(normalized)
  emitChange()
}

export function clearAllAuthState() {
  persistUserRoleString('')
  state = {
    tempPassword: '',
    loginFailCount: 0,
    userRole: '',
    hasSetPassword: false,
  }
  emitChange()
}
