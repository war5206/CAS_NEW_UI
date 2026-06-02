export const USER_ROLES = Object.freeze({
  SUPER: '超管',
  ADMIN: '管理员',
  OPS: '运维',
})

/**
 * loginVerification 返回的 message：仅「超管」「管理员」享有完整菜单；其余及空一律按运维受限。
 */
export function normalizeUserRoleMessage(message) {
  const text = message == null ? '' : String(message).trim()
  if (text === USER_ROLES.SUPER || text === USER_ROLES.ADMIN) {
    return text
  }
  return USER_ROLES.OPS
}

/** 是否隐藏「设置 > 基础设置」（含空角色、脏数据，统按运维） */
export function isRestrictedSettingsUser(roleLike) {
  return normalizeUserRoleMessage(roleLike) === USER_ROLES.OPS
}
