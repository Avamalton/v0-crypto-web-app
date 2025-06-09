"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AdminTokensPage() {
  const { user, userProfile, loading } = useAuth()
  const [tokens, setTokens] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingToken, setEditingToken] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    price_idr: "",
    network: "",
    wallet_address: "",
    logo: "",
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const networkOptions = [
    { value: "BTC", label: "Bitcoin" },
    { value: "ERC-20", label: "Ethereum (ERC-20)" },
    { value: "BNB", label: "BNB Chain" },
    { value: "TRC-20", label: "Tron (TRC-20)" },
    { value: "SOL", label: "Solana" },
    { value: "MATIC", label: "Polygon" },
    { value: "AVAX", label: "Avalanche" },
    { value: "FTM", label: "Fantom" },
    { value: "ATOM", label: "Cosmos" },
    { value: "DOT", label: "Polkadot" },
  ]

  useEffect(() => {
    if (!loading && (!user || !userProfile?.is_admin)) {
      router.push("/dashboard")
    }
  }, [user, userProfile, loading, router])

  useEffect(() => {
    if (user && userProfile?.is_admin) {
      fetchTokens()
    }
  }, [user, userProfile])

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase.from("tokens").select("*").order("name")

      if (error) throw error
      setTokens(data || [])
    } catch (error) {
      console.error("Error fetching tokens:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const tokenData = {
        ...formData,
        price_idr: Number.parseFloat(formData.price_idr),
      }

      if (editingToken) {
        const { error } = await supabase.from("tokens").update(tokenData).eq("id", editingToken.id)

        if (error) throw error
        toast({ title: "Token updated successfully" })
      } else {
        const { error } = await supabase.from("tokens").insert(tokenData)

        if (error) throw error
        toast({ title: "Token created successfully" })
      }

      resetForm()
      fetchTokens()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      symbol: "",
      price_idr: "",
      network: "",
      wallet_address: "",
      logo: "",
      is_active: true,
    })
    setEditingToken(null)
    setShowForm(false)
  }

  const startEdit = (token: any) => {
    setEditingToken(token)
    setFormData({
      name: token.name,
      symbol: token.symbol,
      price_idr: token.price_idr.toString(),
      network: token.network,
      wallet_address: token.wallet_address,
      logo: token.logo || "",
      is_active: token.is_active,
    })
    setShowForm(true)
  }

  const toggleTokenStatus = async (tokenId: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from("tokens").update({ is_active: isActive }).eq("id", tokenId)

      if (error) throw error
      toast({ title: `Token ${isActive ? "activated" : "deactivated"}` })
      fetchTokens()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const deleteToken = async (tokenId: string) => {
    if (!confirm("Are you sure you want to delete this token?")) return

    try {
      const { error } = await supabase.from("tokens").delete().eq("id", tokenId)

      if (error) throw error
      toast({ title: "Token deleted successfully" })
      fetchTokens()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !userProfile?.is_admin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Link>
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Manage Tokens</h1>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Token
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingToken ? "Edit Token" : "Add New Token"}</CardTitle>
              <CardDescription>
                {editingToken ? "Update token information" : "Add a new cryptocurrency to the platform"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Token Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Bitcoin"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input
                      id="symbol"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      placeholder="e.g., BTC"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="price_idr">Price (IDR)</Label>
                    <Input
                      id="price_idr"
                      type="number"
                      step="0.01"
                      value={formData.price_idr}
                      onChange={(e) => setFormData({ ...formData, price_idr: e.target.value })}
                      placeholder="e.g., 500000000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="network">Network</Label>
                    <Select
                      value={formData.network}
                      onValueChange={(value) => setFormData({ ...formData, network: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        {networkOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="wallet_address">Wallet Address</Label>
                    <Input
                      id="wallet_address"
                      value={formData.wallet_address}
                      onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                      placeholder="e.g., 0x1234..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="logo">Logo URL</Label>
                    <Input
                      id="logo"
                      value={formData.logo}
                      onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                      placeholder="e.g., /images/btc.png"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to use default logo. Use /placeholder.svg?height=32&width=32 for placeholder.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>

                <div className="flex space-x-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : editingToken ? "Update Token" : "Add Token"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Tokens</CardTitle>
            <CardDescription>Manage cryptocurrency tokens available on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Price (IDR)</TableHead>
                    <TableHead>Wallet Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <img
                            src={token.logo || "/placeholder.svg?height=32&width=32"}
                            alt={token.name}
                            className="w-6 h-6 rounded-full"
                          />
                          <span>{token.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{token.symbol}</TableCell>
                      <TableCell>{token.network}</TableCell>
                      <TableCell>Rp {token.price_idr.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{token.wallet_address.substring(0, 15)}...</span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={token.is_active}
                          onCheckedChange={(checked) => toggleTokenStatus(token.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => startEdit(token)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteToken(token.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
