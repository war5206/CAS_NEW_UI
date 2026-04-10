import { encryptPasswordAsync } from '../client/auth'
import { get, post } from '../client/http'

export async function loginWithPassword({ baseUrl, username, password }) {
  const encryptedPassword = await encryptPasswordAsync(password)
  return post(
    '/FinforWorx/getTokenAndUser',
    {
      username,
      password: encryptedPassword,
    },
    {
      baseUrl,
      token: '',
    },
  )
}

export async function getToken({ baseUrl, username, password }) {
  const encryptedPassword = await encryptPasswordAsync(password)
  return get(
    `/FinforWorx/getToken?username=${encodeURIComponent(username)}&password=${encodeURIComponent(encryptedPassword)}`,
    {
      baseUrl,
      token: '',
    },
  )
}

export async function getTokenAndUser({ baseUrl, username, password }) {
  const encryptedPassword = await encryptPasswordAsync(password)
  return get(
    `/FinforWorx/getTokenAndUser?username=${encodeURIComponent(username)}&password=${encodeURIComponent(encryptedPassword)}`,
    {
      baseUrl,
      token: '',
    },
  )
}

export async function executeAlgorithmProcess({ baseUrl, token, algorithmProcessId, param }) {
  return post(
    '/FinforWorx/algorithm/process/execute',
    {
      algorithmProcessId,
      param,
    },
    {
      baseUrl,
      token,
    },
  )
}
