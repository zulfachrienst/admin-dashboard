"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, MessageSquare, Package, Loader2, Calendar } from "lucide-react"
import { useApi } from "@/hooks/use-api"

interface Product {
  id: string
  name: string
  description: string
  category: string
  price: string
  stock: number
  brand: string
  features: string[]
  createdAt: {
    _seconds: number
    _nanoseconds: number
  }
  updatedAt: {
    _seconds: number
    _nanoseconds: number
  }
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

interface ChatUser {
  userId: string
  history: ChatMessage[]
}

interface ServiceData {
  maxRetries: number
  successCount: number
  uptime: number
  lastTested: {
    _seconds: number
    _nanoseconds: number
  }
  avgResponse: number
  status?: string
}

interface HealthStatusResponse {
  success: boolean
  data: {
    firebase: ServiceData
    groq: ServiceData
    huggingface: ServiceData
    pinecone: ServiceData
    [key: string]: any
  }
}

type TimeRange = "24h" | "7d" | "30d" | "1y"

const timeRangeLabels = {
  "24h": "Per 24 Jam",
  "7d": "Per Minggu",
  "30d": "Per Bulan",
  "1y": "Per Tahun",
}

const popularProducts = [
  { name: "Wireless Headphones", inquiries: 45, category: "Electronics" },
  { name: "Coffee Maker", inquiries: 32, category: "Appliances" },
  { name: "Smartphone", inquiries: 28, category: "Electronics" },
  { name: "Running Shoes", inquiries: 24, category: "Sports" },
  { name: "Yoga Mat", inquiries: 18, category: "Sports" },
]

interface ErrorLog {
  severity: "LOW" | "MEDIUM" | "HIGH"
  message: string
  code: string | null
  stack: string | null
  timestamp: {
    _seconds: number
    _nanoseconds: number
  }
  source: string
  httpStatus: number | null
  userId: string | null
  requestId: string | null
  endpoint: string | null
  userAgent: string | null
  ip: string | null
  additionalContext: any
}

interface ErrorLogsResponse {
  success: boolean
  data: ErrorLog[]
}

export function StatsSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([])
  const [healthData, setHealthData] = useState<HealthStatusResponse["data"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>("7d")
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])

  const { apiCall } = useApi()

  // Fetch all required data
  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem("token")

      // Fetch products
      const productsResponse = await fetch("https://chatbot-rag-9yyy.onrender.com/api/products")
      const productsResult = await productsResponse.json()

      // Fetch chat users - menggunakan apiCall untuk authorization
      const usersResponse = await apiCall("https://chatbot-rag-9yyy.onrender.com/api/users")
      const usersResult = await usersResponse.json()

      // Fetch health status
      const healthResponse = await fetch("https://chatbot-rag-9yyy.onrender.com/api/health/status")
      const healthResult = await healthResponse.json()

      // Fetch error logs
      const errorLogsResponse = await apiCall("https://chatbot-rag-9yyy.onrender.com/api/error-logs")
      const errorLogsResult = await errorLogsResponse.json()

      if (productsResult.success) {
        setProducts(productsResult.data)
      }

      if (usersResult.success) {
        setChatUsers(usersResult.data)
      }

      if (healthResult.success) {
        setHealthData(healthResult.data)
      }

      if (errorLogsResult.success) {
        // Ambil 4 terbaru saja untuk recent error logs
        setErrorLogs(errorLogsResult.data.slice(0, 4))
      }
    } catch (err) {
      setError("Error fetching data")
      console.error("Error fetching stats data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  // Calculate statistics
  const calculateStats = () => {
    // Total Products
    const totalProducts = products.length

    // Total Stock
    const totalStock = products.reduce((sum, product) => sum + product.stock, 0)

    // Total Chats (total messages from all users)
    const totalChats = chatUsers.reduce((sum, user) => sum + user.history.length, 0)

    // Average Response Time from health data
    const avgResponseTime = healthData
      ? Math.round(
          Object.values(healthData)
            .filter(
              (service): service is ServiceData => service && typeof service === "object" && "avgResponse" in service,
            )
            .reduce((sum, service) => sum + (service.avgResponse || 0), 0) / 4,
        ) / 1000
      : 0 // Convert to seconds

    return {
      totalChats,
      totalProducts,
      avgResponseTime,
      totalStock,
    }
  }

  // Generate chat data based on time range
  const generateChatData = () => {
    if (!chatUsers.length) return []

    const now = new Date()
    const data: { name: string; chats: number }[] = []

    // Get all timestamps from chat history
    const allTimestamps = chatUsers.flatMap((user) => user.history.map((msg) => msg.timestamp))

    if (timeRange === "24h") {
      // Last 24 hours, grouped by hour
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
        const hourStart = hour.getTime()
        const hourEnd = hourStart + 60 * 60 * 1000

        const count = allTimestamps.filter((ts) => ts >= hourStart && ts < hourEnd).length
        data.push({
          name: hour.getHours().toString().padStart(2, "0") + ":00",
          chats: count,
        })
      }
    } else if (timeRange === "7d") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
        const dayEnd = dayStart + 24 * 60 * 60 * 1000

        const count = allTimestamps.filter((ts) => ts >= dayStart && ts < dayEnd).length
        data.push({
          name: day.toLocaleDateString("id-ID", { weekday: "short" }),
          chats: count,
        })
      }
    } else if (timeRange === "30d") {
      // Last 30 days, grouped by week
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
        const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

        const count = allTimestamps.filter((ts) => ts >= weekStart.getTime() && ts < weekEnd.getTime()).length
        data.push({
          name: `Week ${4 - i}`,
          chats: count,
        })
      }
    } else if (timeRange === "1y") {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = month.getTime()
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime()

        const count = allTimestamps.filter((ts) => ts >= monthStart && ts < monthEnd).length
        data.push({
          name: month.toLocaleDateString("id-ID", { month: "short" }),
          chats: count,
        })
      }
    }

    return data
  }

  // Generate category data from products
  const generateCategoryData = () => {
    const categoryCount: { [key: string]: number } = {}

    products.forEach((product) => {
      categoryCount[product.category] = (categoryCount[product.category] || 0) + 1
    })

    const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

    return Object.entries(categoryCount).map(([category, count], index) => ({
      name: category,
      value: count,
      color: colors[index % colors.length],
    }))
  }

  // Function untuk format timestamp
  const formatTimestamp = (timestamp: { _seconds: number; _nanoseconds: number }) => {
    return new Date(timestamp._seconds * 1000).toLocaleString()
  }

  // Function untuk clean message (remove emoji)
  const cleanMessage = (message: string) => {
    return message.replace(/❌|✅|⚠️/g, "").trim()
  }

  // Function untuk extract error type dari message
  const getErrorType = (message: string) => {
    if (message.includes("huggingface")) return "HuggingFace API"
    if (message.includes("database")) return "Database Error"
    if (message.includes("timeout")) return "Timeout Error"
    if (message.includes("rate limit")) return "Rate Limit"
    return "System Error"
  }

  const stats = calculateStats()
  const chatData = generateChatData()
  const categoryData = generateCategoryData()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading statistics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Statistics & Monitoring</h2>
          <p className="text-muted-foreground">Monitor system performance and user engagement</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" onClick={fetchAllData} className="mt-2">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChats.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All messages sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Products in catalog</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime.toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">Average across services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Items in inventory</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Chat Volume</CardTitle>
                <CardDescription>Number of messages over time</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  {Object.entries(timeRangeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chatData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="chats" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
            <CardDescription>Distribution of products by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Products</CardTitle>
            <CardDescription>Products with the most chat inquiries</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Inquiries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popularProducts.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.inquiries}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Error Logs</CardTitle>
            <CardDescription>Latest system errors and issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {errorLogs.map((error, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <Badge
                    variant={
                      error.severity === "HIGH" ? "destructive" : error.severity === "MEDIUM" ? "default" : "secondary"
                    }
                    className="min-w-[60px] justify-center" // Fixed width untuk semua badge
                  >
                    {error.severity}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{getErrorType(error.message)}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{cleanMessage(error.message)}</p>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(error.timestamp)}</p>
                  </div>
                </div>
              ))}
              {errorLogs.length === 0 && <div className="text-center py-4 text-muted-foreground">No recent errors</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
