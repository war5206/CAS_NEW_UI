function toText(value, fallback) {
  if (value == null || value === '') {
    return fallback
  }
  return String(value)
}

export function createDefaultGuideResponse() {
  return {
    state: 'success',
    message: ''
  }
}

export function adaptGuideResponse(rawData) {
  const fallback = createDefaultGuideResponse()
  const responseData = rawData?.data ?? rawData
  const source = responseData?.data ?? responseData ?? {}

  return {
    state: toText(source.state, fallback.state),
    message: toText(source.message, fallback.message)
  }
}
