"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Copy, QrCode, Smartphone, CreditCard, Building, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function PaymentInstructionsPage() {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("type", { ascending: true })

      if (error) throw error
      setPaymentMethods(data || [])
    } catch (error) {
      console.error("Error fetching payment methods:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    })
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case "qris":
        return <QrCode className="h-6 w-6" />
      case "ewallet":
        return <Smartphone className="h-6 w-6" />
      case "bank_transfer":
        return <Building className="h-6 w-6" />
      default:
        return <CreditCard className="h-6 w-6" />
    }
  }

  const getMethodColor = (type: string) => {
    switch (type) {
      case "qris":
        return "from-purple-500 to-pink-500"
      case "ewallet":
        return "from-green-500 to-emerald-500"
      case "bank_transfer":
        return "from-blue-500 to-cyan-500"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  const groupedMethods = paymentMethods.reduce(
    (acc, method) => {
      if (!acc[method.type]) {
        acc[method.type] = []
      }
      acc[method.type].push(method)
      return acc
    },
    {} as Record<string, any[]>,
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
<div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2 sm:gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Payment Instructions
              </h1>
              <p className="text-gray-600">Complete guide for all payment methods</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Overview Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <QrCode className="h-8 w-8" />
                <div>
                  <h3 className="font-bold text-lg">QRIS</h3>
                  <p className="text-purple-100">Instant QR payment</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-8 w-8" />
                <div>
                  <h3 className="font-bold text-lg">E-Wallet</h3>
                  <p className="text-green-100">GoPay, DANA, OVO</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Building className="h-8 w-8" />
                <div>
                  <h3 className="font-bold text-lg">Bank Transfer</h3>
                  <p className="text-blue-100">BCA, Mandiri, BNI</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods Tabs */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Choose Your Payment Method
            </CardTitle>
            <CardDescription className="text-center">Select the payment method that works best for you</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="qris" className="w-full">

<TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
                <TabsTrigger value="qris" className="flex items-center space-x-2">
                  <QrCode className="h-4 w-4" />
                  <span>QRIS</span>
                </TabsTrigger>
                <TabsTrigger value="ewallet" className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <span>E-Wallet</span>
                </TabsTrigger>
                <TabsTrigger value="bank_transfer" className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Bank Transfer</span>
                </TabsTrigger>
              </TabsList>

              {/* QRIS Tab */}
              <TabsContent value="qris" className="space-y-6">
                {groupedMethods.qris?.map((method) => (
                  <Card
                    key={method.id}
                    className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-3 rounded-full bg-gradient-to-r ${getMethodColor(method.type)} text-white`}
                          >
                            {getMethodIcon(method.type)}
                          </div>
                          <div>
                            <CardTitle className="text-xl">{method.display_name}</CardTitle>
                            <CardDescription>{method.description}</CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">Instant</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {method.qr_code_url && (
                        <div className="text-center">
                          <div className="inline-block p-4 bg-white rounded-xl shadow-lg">
                            <Image
                              src={method.qr_code_url || "/placeholder.svg"}
                              alt="QRIS QR Code"
                              width={250}
                              height={250}
                              className="mx-auto"
                            />
                          </div>
                          <p className="mt-4 text-sm text-gray-600">Scan this QR code with any QRIS-enabled app</p>
                        </div>
                      )}

                      <div className="bg-white/70 p-4 rounded-lg">
                        <h4 className="font-semibold mb-3 flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          How to Pay with QRIS:
                        </h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                          <li>Open your mobile banking or e-wallet app</li>
                          <li>Look for "QRIS" or "Scan QR" feature</li>
                          <li>Scan the QR code above</li>
                          <li>Enter the payment amount</li>
                          <li>Confirm the payment</li>
                          <li>Save the transaction receipt</li>
                        </ol>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h5 className="font-semibold text-yellow-800">Important Notes:</h5>
                            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                              <li>• Payment is processed instantly</li>
                              <li>• Make sure to enter the exact amount</li>
                              <li>• Keep your transaction receipt</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* E-Wallet Tab */}
              <TabsContent value="ewallet" className="space-y-6">
                {groupedMethods.ewallet?.map((method) => (
                  <Card
                    key={method.id}
                    className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-3 rounded-full bg-gradient-to-r ${getMethodColor(method.type)} text-white`}
                          >
                            {getMethodIcon(method.type)}
                          </div>
                          <div>
                            <CardTitle className="text-xl">{method.display_name}</CardTitle>
                            <CardDescription>{method.description}</CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">Fast</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white/70 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">Account Details:</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Number:</span>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono">{method.account_number}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(method.account_number, "Account number")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Name:</span>
                              <span className="font-medium">{method.account_name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/70 p-4 rounded-lg">
                          <h4 className="font-semibold mb-3 flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                            Instructions:
                          </h4>
                          <p className="text-sm text-gray-700">{method.instructions}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Bank Transfer Tab */}
              <TabsContent value="bank_transfer" className="space-y-6">
                {groupedMethods.bank_transfer?.map((method) => (
                  <Card key={method.id} className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-3 rounded-full bg-gradient-to-r ${getMethodColor(method.type)} text-white`}
                          >
                            {getMethodIcon(method.type)}
                          </div>
                          <div>
                            <CardTitle className="text-xl">{method.display_name}</CardTitle>
                            <CardDescription>{method.description}</CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">Secure</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-white/70 p-6 rounded-lg">
                        <h4 className="font-semibold mb-4 text-center">Bank Account Details</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                            <span className="text-gray-600">Bank:</span>
                            <span className="font-bold text-blue-700">{method.bank_name}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                            <span className="text-gray-600">Account Number:</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-lg">{method.account_number}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(method.account_number, "Account number")}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                            <span className="text-gray-600">Account Name:</span>
                            <span className="font-semibold">{method.account_name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/70 p-4 rounded-lg">
                        <h4 className="font-semibold mb-3 flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          Transfer Instructions:
                        </h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                          <li>Login to your mobile banking or visit ATM</li>
                          <li>Select "Transfer" or "Transfer Antar Bank"</li>
                          <li>
                            Enter the account number: <strong>{method.account_number}</strong>
                          </li>
                          <li>Enter the exact transfer amount</li>
                          <li>
                            Verify account name: <strong>{method.account_name}</strong>
                          </li>
                          <li>Complete the transfer</li>
                          <li>Save the transfer receipt</li>
                        </ol>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h5 className="font-semibold text-yellow-800">Important:</h5>
                            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                              <li>• Transfer may take 1-15 minutes to process</li>
                              <li>• Double-check account number before transferring</li>
                              <li>• Keep your transfer receipt for verification</li>
                              <li>• Contact support if transfer is not received within 30 minutes</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 border-0 shadow-xl">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold mb-2">Need Help?</h3>
            <p className="text-gray-600 mb-4">
              If you encounter any issues with payments, our support team is here to help.
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline">Contact Support</Button>
              <Button asChild>
                <Link href="/orders">View My Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
