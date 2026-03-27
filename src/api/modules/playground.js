import { encryptPassword } from '../client/auth'
import { post } from '../client/http'

export async function loginWithPassword({ baseUrl, username, password }) {
  return post(
    '/FinforWorx/getTokenAndUser',
    {
      username,
      password: encryptPassword(password),
    },
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
