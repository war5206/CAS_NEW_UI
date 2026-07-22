import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  })

export function renderWithProviders(ui, { route = '/', ...options } = {}) {
  const queryClient = createTestQueryClient()

  const Wrapper = ({ children }) => (
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  }
}
