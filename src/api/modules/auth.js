import { encryptPasswordAsync } from '../client/auth'
import { post } from '../client/http'
import { getApiBaseUrl } from '../client/config'

const DEFAULT_USERNAME = import.meta.env.VITE_DEFAULT_USERNAME || 'admin'
const DEFAULT_PASSWORD = import.meta.env.VITE_DEFAULT_PASSWORD || 'FinforWorx3.0'

export async function acquireSystemToken() {
  const baseUrl = getApiBaseUrl()
  const encryptedPassword = await encryptPasswordAsync(DEFAULT_PASSWORD)

  return post(
    '/FinforWorx/getTokenAndUser',
    { username: DEFAULT_USERNAME, password: encryptedPassword },
    { baseUrl, token: '' },
  )
}
