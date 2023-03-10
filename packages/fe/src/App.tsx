import { MantineProvider, MantineTheme } from '@mantine/core'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { GamesPage } from './pages/GamesPage'
import { CreateGamePage } from './pages/CreateGamePage'
import { CreateProductPage } from './pages/CreateProductPage'
import { EditGamePage } from './pages/EditGamePage'
// import { HomePage } from './pages/HomePage'
import { PublisherPage } from './pages/PublisherPage'
import { ProductPage } from './pages/ProductPage'
import { QueryClient, QueryClientProvider, useQuery } from 'react-query'
import { EditProductPage } from './pages/EditProductPage'

// see https://reactrouter.com/en/main/start/tutorial
const router = createBrowserRouter([
  {
    path: '/',
    element: <PublisherPage />
  },
  {
    path: '/games',
    element: <GamesPage />
  },
  {
    path: '/games/new',
    element: <CreateGamePage />
  },
  {
    path: '/games/:gameId/edit',
    element: <EditGamePage />
  },
  {
    path: '/products/new',
    element: <CreateProductPage />
  },
  {
    path: '/products/:gameId/:marketplaceHashName/edit',
    element: <EditProductPage />
  },
  {
    path: '/products/:productId/preview',
    element: <ProductPage isPreview />
  },
  {
    path: '/publisher',
    element: <PublisherPage />
  }
])

const queryClient = new QueryClient()

const bokorGamesTheme: Partial<MantineTheme> = {
  colorScheme: 'dark',
  primaryColor: 'yellow'
}

export default function App() {
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS theme={bokorGamesTheme}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  )
}
