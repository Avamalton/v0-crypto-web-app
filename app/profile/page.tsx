'use client'

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"

export default function ProfilePage() {
  const { user, userProfile, loading } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [orderLoading, setOrderLoading] = useState(true)
  const [totalBuy, setTotalBuy] = useState(0)
  const [totalSell, setTotalSell] = useState(0)

  useEffect(() => {
    if (!user) return

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, type, quantity, total_price, status, created_at,
          tokens(name, symbol)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching orders:", error)
      } else {
        setOrders(data || [])
        const buyTotal = data
          .filter((o: any) => o.type === 'buy')
          .reduce((acc: number, cur: any) => acc + Number(cur.total_price), 0)
        const sellTotal = data
          .filter((o: any) => o.type === 'sell')
          .reduce((acc: number, cur: any) => acc + Number(cur.total_price), 0)
        setTotalBuy(buyTotal)
        setTotalSell(sellTotal)
      }

      setOrderLoading(false)
    }

    fetchOrders()
  }, [user])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!user || !userProfile) {
    return (
      <div className="text-center mt-20 text-2xl font-bold uppercase">
        ❌ Kamu belum login
      </div>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      <h1 className="text-4xl font-black border-b-4 border-black pb-2 uppercase">
        👤 Profile
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN */}
        <div className="col-span-1 space-y-6">
          <Card className="bg-white border-2 border-black shadow-[5px_5px_0_#000] p-6 space-y-2">
            <div className="font-mono text-lg">
              <p><strong>Email:</strong> {userProfile.email}</p>
              <p><strong>Username:</strong> {userProfile.username || "Belum diatur"}</p>
              <p><strong>Admin:</strong> {userProfile.is_admin ? "✅ Ya" : "❌ Tidak"}</p>
              <p><strong>Dibuat:</strong> {new Date(userProfile.created_at).toLocaleString()}</p>
            </div>
          </Card>

          <Card className="border-2 border-black shadow-[5px_5px_0_#000] bg-white p-6 space-y-4">
            <h2 className="text-xl font-bold uppercase">📊 Total Transaksi</h2>
            <div className="grid grid-cols-2 gap-4 text-lg font-mono">
              <div className="p-4 border border-black bg-gray-100">
                <p className="font-bold uppercase">Buy</p>
                <p>Rp {totalBuy.toLocaleString()}</p>
              </div>
              <div className="p-4 border border-black bg-gray-100">
                <p className="font-bold uppercase">Sell</p>
                <p>Rp {totalSell.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Buy', total: totalBuy, fill: '#16a34a' },
                  { name: 'Sell', total: totalSell, fill: '#dc2626' },
                ]}>
                  <XAxis dataKey="name" stroke="#000" />
                  <YAxis stroke="#000" />
                  <Tooltip />
                  <Bar dataKey="total" fill="#000" barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-2">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold uppercase">📦 Order History</h2>

            {orderLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : orders.length === 0 ? (
              <div className="p-6 border-2 border-black shadow-[5px_5px_0_#000] bg-white text-lg font-mono">
                Belum ada order.
              </div>
            ) : (
              <div className="overflow-x-auto border-2 border-black shadow-[5px_5px_0_#000] bg-white">
                <table className="w-full table-auto text-left font-mono">
                  <thead className="bg-black text-white uppercase text-sm">
                    <tr>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Token</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Total (Rp)</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t border-black">
                        <td className="px-4 py-2">{order.type}</td>
                        <td className="px-4 py-2">{order.tokens?.symbol}</td>
                        <td className="px-4 py-2">{order.quantity}</td>
                        <td className="px-4 py-2">Rp {Number(order.total_price).toLocaleString()}</td>
                        <td className="px-4 py-2">{order.status}</td>
                        <td className="px-4 py-2 text-sm">{new Date(order.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
