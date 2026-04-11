import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { clearStoredToken } from '@/api/client/auth'

function handleGlobalQueryError(error) {
  const status = error?.status

  if (status === 401) {
    clearStoredToken()
    const loc = window.location
    const isHash = loc.hash.startsWith('#/')
    if (isHash) {
      loc.hash = '#/'
    } else {
      loc.href = loc.origin + loc.pathname.replace(/\/[^/]*$/, '/')
    }
    return
  }

  if (import.meta.env.DEV) {
    console.error('[QueryCache] Unhandled query error:', error)
  }
}

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleGlobalQueryError,
    }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error?.status === 401 || error?.status === 403) return false
          return failureCount < 1
        },
        refetchOnWindowFocus: false,
        staleTime: 5_000,
      },
    },
  })
}

function QueryProvider({ children }) {
  const [queryClient] = useState(createQueryClient)

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export default QueryProvider
