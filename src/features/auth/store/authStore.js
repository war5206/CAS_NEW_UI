import { useSyncExternalStore } from 'react'

const listeners = new Set()

let state = {
  // 设置的临时密码
  tempPassword: '',
  // 登录失败次数
  loginFailCount: 0,
  // 用户权限
  userRole: '',
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
  state = {
    ...state,
    userRole: role,
  }
  emitChange()
}

export function clearAllAuthState() {
  state = {
    tempPassword: '',
    loginFailCount: 0,
    userRole: '',
    hasSetPassword: false,
  }
  emitChange()
}
