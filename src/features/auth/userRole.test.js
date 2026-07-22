import { describe, expect, it } from 'vitest'
import { isRestrictedSettingsUser, normalizeUserRoleMessage, USER_ROLES } from './userRole'

describe('userRole', () => {
  describe('normalizeUserRoleMessage', () => {
    it('应识别超管与管理员', () => {
      expect(normalizeUserRoleMessage('超管')).toBe(USER_ROLES.SUPER)
      expect(normalizeUserRoleMessage('管理员')).toBe(USER_ROLES.ADMIN)
    })

    it('其它值应统一归运维', () => {
      expect(normalizeUserRoleMessage('运维')).toBe(USER_ROLES.OPS)
      expect(normalizeUserRoleMessage('abc')).toBe(USER_ROLES.OPS)
      expect(normalizeUserRoleMessage('')).toBe(USER_ROLES.OPS)
      expect(normalizeUserRoleMessage(null)).toBe(USER_ROLES.OPS)
    })
  })

  describe('isRestrictedSettingsUser', () => {
    it('运维角色应被限制访问基础设置', () => {
      expect(isRestrictedSettingsUser('运维')).toBe(true)
    })

    it('超管与管理员不应被限制', () => {
      expect(isRestrictedSettingsUser('超管')).toBe(false)
      expect(isRestrictedSettingsUser('管理员')).toBe(false)
    })
  })
})
