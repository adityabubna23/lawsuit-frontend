import { FC, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useWalletStore from '@/stores/walletStore'

const giftCards = [
  { id: 'g1', title: 'Amazon Gift Card', amount: 100 },
  { id: 'g2', title: 'Flipkart Gift Card', amount: 500 },
  { id: 'g3', title: 'Google Play Gift Card', amount: 1000 },
]

const WithdrawPage: FC = () => {
  const navigate = useNavigate()
  const { balance, buyGiftCard, fetchWallet, loading } = useWalletStore()
  const [msg, setMsg] = useState<string | null>(null)

  const handleBuy = async (card: any) => {
    setMsg(null)
    const res = await buyGiftCard(card.amount, card.title)
    if (res.success) {
      setMsg('Purchase successful')
      // refresh wallet
      await fetchWallet()
      setTimeout(() => navigate('/app/wallet'), 900)
    } else {
      setMsg(res.message || 'Failed to purchase')
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold mb-4">Buy Gift Card</h1>
        <div className="text-sm text-gray-500 mb-4">Wallet balance: <span className="font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(balance)}</span></div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {giftCards.map((g) => (
            <div key={g.id} className="p-4 border rounded-lg flex flex-col">
              <div className="flex-1">
                <div className="font-medium">{g.title}</div>
                <div className="text-sm text-gray-500 mt-2">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(g.amount)}</div>
              </div>
              <div className="mt-4">
                <button onClick={() => handleBuy(g)} disabled={loading} className="w-full px-3 py-2 bg-primary text-white rounded">Buy</button>
              </div>
            </div>
          ))}
        </div>

        {msg && <div className="mt-4 text-sm text-gray-700">{msg}</div>}
      </div>
    </div>
  )
}

export default WithdrawPage
