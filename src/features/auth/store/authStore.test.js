import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  clearAllAuthState,
  incrementLoginFailCount,
  resetLoginFailCount,
  setTempPassword,
  setUserRole,
  useAuthStore,
} from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    clearAllAuthState()
  })

  it('设置临时密码后 hasSetPassword 应为 true', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => setTempPassword('123456'))

    expect(result.current.tempPassword).toBe('123456')
    expect(result.current.hasSetPassword).toBe(true)
  })

  it('登录失败计数递增与重置', () => {
    const { result } = renderHook(() => useAuthStore())

    act(() => incrementLoginFailCount())
    act(() => incrementLoginFailCount())
    expect(result.current.loginFailCount).toBe(2)

    act(() => resetLoginFailCount())
    expect(result.current.loginFailCount).toBe(0)
  })

  it('设置用户角色后持久化到 localStorage', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => setUserRole('管理员'))

    expect(result.current.userRole).toBe('管理员')
    expect(localStorage.getItem('cas.userRole')).toBe('管理员')
  })

  it('清除状态应清空 localStorage 与所有字段', () => {
    const { result } = renderHook(() => useAuthStore())

    act(() => setTempPassword('123456'))
    act(() => setUserRole('超管'))
    act(() => incrementLoginFailCount())
    act(() => clearAllAuthState())

    expect(result.current.tempPassword).toBe('')
    expect(result.current.userRole).toBe('')
    expect(result.current.loginFailCount).toBe(0)
    expect(result.current.hasSetPassword).toBe(false)
    expect(localStorage.getItem('cas.userRole')).toBeNull()
  })
})
