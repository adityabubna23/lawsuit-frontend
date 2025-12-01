import { FC } from 'react'
import { useParams } from 'react-router-dom'

const BookingPage: FC = () => {
  const { lawyerId } = useParams<{ lawyerId: string }>()

  return (
    <div>
      <h1>Book Consultation</h1>
      {/* Booking form will be implemented here */}
    </div>
  )
}

export default BookingPage