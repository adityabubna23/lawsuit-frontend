import { FC, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useWalletStore from '../../stores/walletStore'

const tabs = [
  { id: 'alltransactions', label: 'All Transactions' },
  { id: 'cashbacks', label: 'Cashbacks' },
]

const WalletPage: FC = () => {
  const { balance, transactions, fetchWallet, loading } = useWalletStore()
  const [activeTab, setActiveTab] = useState<string>('alltransactions')

  useEffect(() => {
    fetchWallet().catch(() => {})
  }, [])

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold mb-4">Wallet</h1>
        <div className="flex items-center justify-between">
            <div className="mb-4">
                <div className="text-sm text-gray-500">Balance</div>
                <div className="text-3xl font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(balance)}</div>
            </div>

            <div className="pt-4 flex flex-col space-y-4">
                <button className="px-4 py-2 bg-primary text-white rounded">Top up Wallet</button>
                <Link to="/app/withdraw" className="px-4 py-2 bg-primary text-white rounded">Buy Gift Card</Link>
            </div>
        </div> 
      </div>
      {/* Tabs */}
      <div className="mt-4 border-b">
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
      </div>
      {/* Tab Content */}
      <div className="bg-white rounded-b-xl rounded-tr-xl">
            {activeTab === 'alltransactions' && (
                loading && <div className="text-sm text-gray-500">Loading transactions…</div> || 
                !loading && transactions.length === 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">No transactions yet</div>
                      <div className="text-sm text-gray-500">Your past payments and cashbacks will appear here.</div>
                    </div>
                  </div>
                ) || !loading && transactions.length > 0 && (
                        <div className="space-y-2">
                        {transactions.map((a) => {
                            const isCashback = a.type === 'cashback'
                            const label = isCashback ? 'Cashback' : (a.type === 'giftcard' || a.meta?.kind === 'giftcard') ? `Gift Card - ${a.meta?.cardType ?? ''}` : (a.meta?.appointmentId ? 'Appointment' : 'Transaction')
                            const amountStr = fmt(Math.abs(a.amount))
                            const sign = isCashback ? '+' : '-'
                            const amountClass = isCashback ? 'text-green-600' : 'text-red-600'

                            return (
                              <div key={a.id} className="p-3  flex items-center justify-between border-b">
                                <div>
                                  <div className="font-medium">{label}</div>
                                  <div className="text-sm text-gray-500">{new Date(a.createdAt).toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-medium ${amountClass}`}>{sign}{amountStr}</div>
                                  <div className="text-sm text-gray-500">{isCashback ? 'Added to wallet' : (a.meta?.kind === 'giftcard' ? 'Used for giftcard' : '')}</div>
                                </div>
                              </div>
                            )
                        })}
                        </div>
                    )
          )}
            {activeTab === 'cashbacks' && (!loading && transactions.length === 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">No transactions yet</div>
                      <div className="text-sm text-gray-500">Your past cashbacks will appear here.</div>
                    </div>
                  </div>
                ) || !loading && transactions.filter(t => t.type === 'cashback').length > 0 && (
                        <div className="space-y-2">
                        {transactions.filter(t => t.type === 'cashback').map((a) => (
                            <div key={a.id} className="p-3  flex items-center justify-between border-b">
                            <div>
                                <div className="font-medium">Cashback</div>
                                <div className="text-sm text-gray-500">{new Date(a.createdAt).toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-medium text-green-600">+{fmt(Math.abs(a.amount))}</div>
                                <div className="text-sm text-gray-500">Added to wallet</div>
                            </div>
                            </div>
                        ))}
                        </div>
                    )
                )}
      </div>
    </div>
  )
}

export default WalletPage
