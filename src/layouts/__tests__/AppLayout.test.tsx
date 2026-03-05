import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AppLayout from '../AppLayout'
import { useAuthStore } from '../../stores/authStore'

// Mock the auth store
jest.mock('../../stores/authStore', () => ({
  useAuthStore: jest.fn()
}))

// Mock the notification store
jest.mock('../../stores/notificationStore', () => ({
  useNotificationStore: Object.assign(
    jest.fn((selector?: any) => {
      const state = {
        notifications: [],
        unreadCount: 0,
        toast: null,
        fetchNotifications: jest.fn(),
        fetchNextPage: jest.fn(),
        fetchUnreadCount: jest.fn(),
        markRead: jest.fn(),
        markAllRead: jest.fn(),
        deleteNotification: jest.fn(),
        clearToast: jest.fn(),
        initSocketListeners: jest.fn(() => jest.fn()),
        isLoading: false,
        hasMore: false,
      }
      return selector ? selector(state) : state
    }),
    { getState: jest.fn(() => ({ notifications: [], unreadCount: 0, initSocketListeners: jest.fn(() => jest.fn()), fetchNotifications: jest.fn(), fetchUnreadCount: jest.fn() })) }
  ),
}))

// Mock the wallet store
jest.mock('../../stores/walletStore', () => ({
  __esModule: true,
  default: Object.assign(
    jest.fn((selector?: any) => {
      const state = { balance: 0, fetchBalance: jest.fn().mockResolvedValue(undefined) }
      return selector ? selector(state) : state
    }),
    { getState: jest.fn(() => ({ balance: 0, fetchBalance: jest.fn() })) }
  ),
}))

// Mock the notification socket hook
jest.mock('../../hooks/useNotificationSocket', () => ({
  useNotificationSocket: jest.fn(),
}))

// Mock socket service
jest.mock('../../services/socketService', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    onNotification: jest.fn(() => jest.fn()),
    onUnreadCountUpdate: jest.fn(() => jest.fn()),
    getOnlineUsers: jest.fn(() => []),
  },
  socketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}))

// Mock the Outlet component from react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div data-testid="outlet">Outlet Content</div>
}))

describe('AppLayout', () => {
  const mockUser = {
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://example.com/avatar.jpg'
  }

  const mockLogout = jest.fn()

  beforeEach(() => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: mockUser,
      logout: mockLogout
    })
  })

  it('renders navigation links', () => {
    render(
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Search Lawyers')).toBeInTheDocument()
    expect(screen.getByText('Appointments')).toBeInTheDocument()
    expect(screen.getByText('Cases')).toBeInTheDocument()
  })

  it('displays user avatar in desktop menu', () => {
    render(
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    )

    expect(screen.getByAltText('John Doe')).toBeInTheDocument()
  })

  it('opens user menu and calls logout when sign out is clicked', async () => {
    render(
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    )

    // First, we need to open the mobile menu because the sign out button is in there
    const menuButton = screen.getByRole('button', { name: /open main menu/i })
    fireEvent.click(menuButton)

    // Now we should be able to see and click the sign out button
    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    fireEvent.click(signOutButton)

    expect(mockLogout).toHaveBeenCalled()
  })

  it('toggles mobile menu when hamburger button is clicked', () => {
    render(
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    )

    const mobileMenuButton = screen.getByRole('button', { name: /open main menu/i })
    
    // Menu should be hidden initially
    expect(screen.queryByRole('link', { name: 'Your Profile' })).not.toBeInTheDocument()

    // Click to open menu
    fireEvent.click(mobileMenuButton)
    
    // Menu should be visible now
    expect(screen.getByRole('link', { name: 'Your Profile' })).toBeInTheDocument()

    // Click again to close menu
    fireEvent.click(mobileMenuButton)
    
    // Menu should be hidden again
    expect(screen.queryByRole('link', { name: 'Your Profile' })).not.toBeInTheDocument()
  })
})