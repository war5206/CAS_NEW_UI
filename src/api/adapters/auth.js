function toText(value, fallback) {
  if (value == null || value === '') {
    return fallback
  }
  return String(value)
}

export function createDefaultSetPasswordResponse() {
  return {
    state: 'success'
  }
}

export function createDefaultLoginResponse() {
  return {
    result: {
      state: 'success',
      message: ''
    }
  }
}

export function adaptSetOperationPasswordResponse(rawData) {
  const fallback = createDefaultSetPasswordResponse()
  // 处理统一返回结构 { code, data, msg, success }
  const responseData = rawData?.data ?? rawData
  const source = responseData?.data ?? responseData ?? {}

  return {
    state: toText(source.state, fallback.state)
  }
}

export function adaptLoginVerificationResponse(rawData) {
  const fallback = createDefaultLoginResponse()
  // 处理统一返回结构 { code, data, msg, success }
  const responseData = rawData?.data ?? rawData
  const source = responseData?.data ?? responseData ?? {}
  const result = source.result ?? {}

  return {
    result: {
      state: toText(result.state, fallback.result.state),
      message: toText(result.message, fallback.result.message)
    }
  }
}
