import { render, screen, fireEvent } from '@testing-library/react'
import LawyerCard from '../LawyerCard'

const mockLawyerData = {
  id: '123',
  name: 'John Doe',
  specialization: ['Criminal Law', 'Family Law'],
  experienceYears: 10,
  rating: 4.5,
  fee: 150,
  location: 'New York',
  languages: ['English', 'Spanish'],
  description: 'Expert lawyer with extensive experience in criminal and family law.',
  avatar: 'https://example.com/avatar.jpg'
}

describe('LawyerCard', () => {
  const onView = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders lawyer information correctly', () => {
    render(<LawyerCard {...mockLawyerData} onView={onView} />)
    // Check if basic information is rendered
    expect(screen.getByText(mockLawyerData.name)).toBeInTheDocument()
    expect(screen.getByText('Criminal Law • Family Law')).toBeInTheDocument()
    expect(screen.getByText('10 years experience')).toBeInTheDocument()
    expect(screen.getByText('New York')).toBeInTheDocument()
    expect(screen.getByText('English, Spanish')).toBeInTheDocument()
    expect(screen.getByText('$150/hr')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()

  // Check if key interactive elements are rendered
  expect(screen.getByText('View Profile')).toBeInTheDocument()
  expect(screen.getByText('Consult Now')).toBeInTheDocument()

    // Check if avatar is rendered with correct src
    const avatar = screen.getByAltText(mockLawyerData.name) as HTMLImageElement
    expect(avatar.src).toBe(mockLawyerData.avatar)
  })

  it('uses placeholder avatar when no avatar is provided', () => {
    const dataWithoutAvatar = { ...mockLawyerData, avatar: undefined }
  render(<LawyerCard {...dataWithoutAvatar} onView={onView} />)

    const avatar = screen.getByAltText(mockLawyerData.name) as HTMLImageElement
    expect(avatar.src).toContain('ui-avatars.com')
    expect(avatar.src).toContain(encodeURIComponent(mockLawyerData.name))
  })

  it('toggles inline booking (SlotSelect) when Consult Now is clicked', () => {
    render(<LawyerCard {...mockLawyerData} onView={onView} />)

    // Slot selector should not be visible initially
    expect(screen.queryByText(/Morning/i)).not.toBeInTheDocument()

    // Click the Consult Now button to expand inline booking
    fireEvent.click(screen.getByText('Consult Now'))

    // SlotSelect shows section headings like 'Morning'
    expect(screen.getByText(/Morning/i)).toBeInTheDocument()
  })

  it('calls onView when View Profile button is clicked', () => {
    render(<LawyerCard {...mockLawyerData} onView={onView} />)

    fireEvent.click(screen.getByText('View Profile'))
    expect(onView).toHaveBeenCalledWith(mockLawyerData.id)
    expect(onView).toHaveBeenCalledTimes(1)
  })
  it('does not open inline booking when clicking View Profile', () => {
    render(<LawyerCard {...mockLawyerData} onView={onView} />)

    // Click the View Profile text
    fireEvent.click(screen.getByText('View Profile'))

    // Inline booking should not be visible
    expect(screen.queryByText(/Morning/i)).not.toBeInTheDocument()
  })
})