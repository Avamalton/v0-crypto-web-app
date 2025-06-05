"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AdminMarketPage() {
  const { user, userProfile, loading } = useAuth()
  const [marketAds, setMarketAds] = useState<any[]>([])
  const [tokens, setTokens] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingAd, setEditingAd] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "buy" as "buy" | "sell",
    token_id: "",
    price_idr: "",
    min_amount: "",
    max_amount: "",
    payment_methods: [] as string[],
    terms: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || !userProfile?.is_admin)) {
      router.push("/dashboard")
    }
  }, [user, userProfile, loading, router])

  useEffect(() => {
    if (user && userProfile?.is_admin) {
      fetchMarketAds()
      fetchTokens()
      fetchPaymentMethods()
    }
  }, [user, userProfile])

  const fetchMarketAds = async () => {
    try {
      const { data, error } = await supabase
        .from("market_ads")
        .select(`
          *,
          tokens (name, symbol, network),
          users (username, email)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setMarketAds(data || [])
    } catch (error) {
      console.error("Error fetching market ads:", error)
    }
  }

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase.from("tokens").select("*").eq("is_active", true).order("name")

      if (error) throw error
      setTokens(data || [])
    } catch (error) {
      console.error("Error fetching tokens:", error)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase.from("payment_methods").select("*").eq("is_active", true).order("name")

      if (error) throw error
      setPaymentMethods(data || [])
    } catch (error) {
      console.error("Error fetching payment methods:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const adData = {
        ...formData,
        price_idr: Number.parseFloat(formData.price_idr),
        min_amount: formData.min_amount ? Number.parseFloat(formData.min_amount) : 0,
        max_amount: formData.max_amount ? Number.parseFloat(formData.max_amount) : null,
        created_by: user?.id,
      }

      if (editingAd) {
        const { error } = await supabase.from("market_ads").update(adData).eq("id", editingAd.id)

        if (error) throw error
        toast({ title: "Market ad updated successfully" })
      } else {
        const { error } = await supabase.from("market_ads").insert(adData)

        if (error) throw error
        toast({ title: "Market ad created successfully" })
      }

      resetForm()
      fetchMarketAds()
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
      title: "",
      description: "",
      type: "buy",
      token_id: "",
      price_idr: "",
      min_amount: "",
      max_amount: "",
      payment_methods: [],
      terms: "",
    })
    setEditingAd(null)
    setShowForm(false)
  }

  const startEdit = (ad: any) => {
    setEditingAd(ad)
    setFormData({
      title: ad.title,
      description: ad.description || "",
      type: ad.type,
      token_id: ad.token_id,
      price_idr: ad.price_idr.toString(),
      min_amount: ad.min_amount?.toString() || "",
      max_amount: ad.max_amount?.toString() || "",
      payment_methods: ad.payment_methods || [],
      terms: ad.terms || "",
    })
    setShowForm(true)
  }

  const toggleAdStatus = async (adId: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from("market_ads").update({ is_active: isActive }).eq("id", adId)

      if (error) throw error
      toast({ title: `Ad ${isActive ? "activated" : "deactivated"}` })
      fetchMarketAds()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const deleteAd = async (adId: string) => {
    if (!confirm("Are you sure you want to delete this ad?")) return

    try {
      const { error } = await supabase.from("market_ads").delete().eq("id", adId)

      if (error) throw error
      toast({ title: "Ad deleted successfully" })
      fetchMarketAds()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handlePaymentMethodChange = (methodName: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      payment_methods: checked
        ? [...prev.payment_methods, methodName]
        : prev.payment_methods.filter((m) => m !== methodName),
    }))
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
              <h1 className="text-2xl font-bold text-gray-900">Market Advertisements</h1>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Ad
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingAd ? "Edit Advertisement" : "Create New Advertisement"}</CardTitle>
              <CardDescription>
                {editingAd ? "Update advertisement information" : "Create a new buy/sell advertisement for the market"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Buy USDT - Best Rate"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "buy" | "sell") => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Buy (Admin buys from users)</SelectItem>
                        <SelectItem value="sell">Sell (Admin sells to users)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="token">Token</Label>
                    <Select
                      value={formData.token_id}
                      onValueChange={(value) => setFormData({ ...formData, token_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select token" />
                      </SelectTrigger>
                      <SelectContent>
                        {tokens.map((token) => (
                          <SelectItem key={token.id} value={token.id}>
                            {token.name} ({token.symbol}) - {token.network}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="price_idr">Price (IDR)</Label>
                    <Input
                      id="price_idr"
                      type="number"
                      step="0.01"
                      value={formData.price_idr}
                      onChange={(e) => setFormData({ ...formData, price_idr: e.target.value })}
                      placeholder="e.g., 15800"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_amount">Min Amount</Label>
                    <Input
                      id="min_amount"
                      type="number"
                      step="0.00000001"
                      value={formData.min_amount}
                      onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                      placeholder="e.g., 10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_amount">Max Amount</Label>
                    <Input
                      id="max_amount"
                      type="number"
                      step="0.00000001"
                      value={formData.max_amount}
                      onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                      placeholder="e.g., 1000"
                    />
                  </div>
                </div>

                <div>
                  <Label>Payment Methods</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={method.name}
                          checked={formData.payment_methods.includes(method.name)}
                          onCheckedChange={(checked) => handlePaymentMethodChange(method.name, checked as boolean)}
                        />
                        <Label htmlFor={method.name} className="text-sm">
                          {method.display_name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your offer..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Textarea
                    id="terms"
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    placeholder="Enter terms and conditions..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : editingAd ? "Update Ad" : "Create Ad"}
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
            <CardTitle>Market Advertisements</CardTitle>
            <CardDescription>Manage buy and sell advertisements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Amount Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketAds.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ad.title}</p>
                          <p className="text-sm text-gray-600">{ad.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ad.type === "buy" ? "default" : "outline"}>
                          {ad.type === "buy" ? (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          )}
                          {ad.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ad.tokens?.symbol}</p>
                          <p className="text-sm text-gray-600">{ad.tokens?.network}</p>
                        </div>
                      </TableCell>
                      <TableCell>Rp {ad.price_idr.toLocaleString()}</TableCell>
                      <TableCell>
                        {ad.min_amount && ad.max_amount
                          ? `${ad.min_amount} - ${ad.max_amount}`
                          : ad.min_amount
                            ? `Min: ${ad.min_amount}`
                            : ad.max_amount
                              ? `Max: ${ad.max_amount}`
                              : "No limit"}
                      </TableCell>
                      <TableCell>
                        <Switch checked={ad.is_active} onCheckedChange={(checked) => toggleAdStatus(ad.id, checked)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => startEdit(ad)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteAd(ad.id)}>
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
