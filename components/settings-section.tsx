"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Save, Key, Database, Zap, Copy } from "lucide-react"

interface EnvVariable {
  name: string
  value: string
  type: "api_key" | "database" | "config"
  masked: boolean
}

const envVariables: EnvVariable[] = [
  { name: "OPENAI_API_KEY", value: "sk-...abc123", type: "api_key", masked: true },
  { name: "FIREBASE_CONFIG", value: "firebase-config-...", type: "database", masked: true },
  { name: "PINECONE_API_KEY", value: "pc-...xyz789", type: "api_key", masked: true },
  { name: "REDIS_URL", value: "redis://localhost:6379", type: "database", masked: false },
  { name: "MAX_CHAT_HISTORY", value: "100", type: "config", masked: false },
  { name: "RATE_LIMIT_PER_HOUR", value: "1000", type: "config", masked: false },
]

const apiEndpoints = [
  {
    method: "GET",
    endpoint: "/test",
    description: "Test route untuk memastikan chat routes berfungsi",
    permission: "PUBLIC",
    badgeClass: "bg-green-100 text-green-800"
  },
  {
    method: "POST",
    endpoint: "/chat",
    description: "Endpoint untuk memproses pesan chat dari user",
    permission: "PUBLIC",
    badgeClass: "bg-green-100 text-green-800"
  },
  {
    method: "GET",
    endpoint: "/products",
    description: "Mengambil semua produk yang tersedia",
    permission: "PUBLIC",
    badgeClass: "bg-green-100 text-green-800"
  },
  {
    method: "GET",
    endpoint: "/stats",
    description: "Mengambil statistik total produk dan total user",
    permission: "PUBLIC",
    badgeClass: "bg-green-100 text-green-800"
  },
  {
    method: "GET",
    endpoint: "/health/status",
    description: "Mengambil status kesehatan layanan dari Firestore",
    permission: "PUBLIC",
    badgeClass: "bg-green-100 text-green-800"
  },
  {
    method: "POST",
    endpoint: "/products",
    description: "Menambah produk baru (dengan upload gambar)",
    permission: "ADMIN",
    badgeClass: "bg-red-100 text-red-800"
  },
  {
    method: "PUT",
    endpoint: "/products/:id",
    description: "Mengubah/update produk berdasarkan ID (dengan upload gambar)",
    permission: "ADMIN",
    badgeClass: "bg-red-100 text-red-800"
  },
  {
    method: "DELETE",
    endpoint: "/products/:id",
    description: "Menghapus produk berdasarkan ID",
    permission: "ADMIN",
    badgeClass: "bg-red-100 text-red-800"
  },
  {
    method: "GET",
    endpoint: "/users",
    description: "Mengambil daftar semua user",
    permission: "ADMIN",
    badgeClass: "bg-red-100 text-red-800"
  },
  {
    method: "POST",
    endpoint: "/health/test/:service",
    description: "Testing layanan tertentu (huggingface, groq, pinecone, firebase)",
    permission: "ADMIN",
    badgeClass: "bg-red-100 text-red-800"
  },
  {
    method: "GET",
    endpoint: "/error-logs",
    description: "Mengambil error logs dari sistem",
    permission: "ADMIN",
    badgeClass: "bg-red-100 text-red-800"
  },
  {
    method: "GET",
    endpoint: "/system-logs",
    description: "Mengambil system logs dengan pagination",
    permission: "ADMIN",
    badgeClass: "bg-red-100 text-red-800"
  },
  {
    method: "DELETE",
    endpoint: "/clear-logs",
    description: "Menghapus logs berdasarkan waktu dan level",
    permission: "ADMIN",
    badgeClass: "bg-red-100 text-red-800"
  },
  {
    method: "GET",
    endpoint: "/users/:userId/history",
    description: "Mengambil riwayat chat user tertentu",
    permission: "SELF OR ADMIN",
    badgeClass: "bg-orange-100 text-orange-800"
  },
  {
    method: "DELETE",
    endpoint: "/users/:userId/history",
    description: "Menghapus riwayat chat user tertentu",
    permission: "SELF OR ADMIN",
    badgeClass: "bg-orange-100 text-orange-800"
  }
]

export function SettingsSection() {
  const [settings, setSettings] = useState({
    maxChatsPerUser: 50,
    maxProductEntries: 1000,
    chatHistoryRetention: 30,
    enableRateLimit: true,
    enableLogging: true,
    enableAnalytics: true,
  })

  const [maskedStates, setMaskedStates] = useState<Record<string, boolean>>(
    envVariables.reduce((acc, env) => ({ ...acc, [env.name]: env.masked }), {}),
  )

  const [copied, setCopied] = useState<string | null>(null)

  const toggleMask = (envName: string) => {
    setMaskedStates((prev) => ({ ...prev, [envName]: !prev[envName] }))
  }

  const handleSettingChange = (key: string, value: number | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "api_key":
        return <Key className="h-4 w-4" />
      case "database":
        return <Database className="h-4 w-4" />
      case "config":
        return <Zap className="h-4 w-4" />
      default:
        return null
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "api_key":
        return <Badge className="bg-blue-100 text-blue-800">API Key</Badge>
      case "database":
        return <Badge className="bg-green-100 text-green-800">Database</Badge>
      case "config":
        return <Badge className="bg-purple-100 text-purple-800">Config</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const handleCopy = (endpoint: string) => {
    navigator.clipboard.writeText(endpoint)
    setCopied(endpoint)
    setTimeout(() => setCopied(null), 1200)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground">Configure system parameters and view environment info</p>
        </div>
      </div>

      <Tabs defaultValue="limits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="limits">System Limits</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Limits</CardTitle>
              <CardDescription>Configure maximum limits for various system components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxChats">Max Chats Per User</Label>
                  <Input
                    id="maxChats"
                    type="number"
                    value={settings.maxChatsPerUser}
                    onChange={(e) => handleSettingChange("maxChatsPerUser", Number.parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">Maximum number of chat sessions per user per day</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxProducts">Max Product Entries</Label>
                  <Input
                    id="maxProducts"
                    type="number"
                    value={settings.maxProductEntries}
                    onChange={(e) => handleSettingChange("maxProductEntries", Number.parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">Maximum number of products in the catalog</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retention">Chat History Retention (days)</Label>
                  <Input
                    id="retention"
                    type="number"
                    value={settings.chatHistoryRetention}
                    onChange={(e) => handleSettingChange("chatHistoryRetention", Number.parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">How long to keep chat history before deletion</p>
                </div>
              </div>
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Limits
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>View system environment configuration (sensitive values are masked)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variable</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {envVariables.map((env) => (
                    <TableRow key={env.name}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {getTypeIcon(env.type)}
                        {env.name}
                      </TableCell>
                      <TableCell>{getTypeBadge(env.type)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {maskedStates[env.name] && env.type === "api_key" ? "••••••••••••••••" : env.value}
                      </TableCell>
                      <TableCell>
                        {env.type === "api_key" && (
                          <Button variant="outline" size="sm" onClick={() => toggleMask(env.name)}>
                            {maskedStates[env.name] ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* API Endpoints List */}
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>Daftar endpoint API beserta permission dan fitur copy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiEndpoints.map((ep) => (
                <div
                  key={ep.method + ep.endpoint}
                  className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">{ep.method}</span>
                      <span className="font-mono text-sm">{ep.endpoint}</span>
                      <Badge className={ep.badgeClass}>{ep.permission}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{ep.description}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 md:mt-0 flex items-center gap-1"
                    onClick={() => handleCopy(ep.endpoint)}
                  >
                    <Copy className="h-4 w-4" />
                    {copied === ep.endpoint ? "Copied!" : "Copy"}
                  </Button>
                </div>
              ))}
              <div className="mt-2 text-xs text-muted-foreground">
                <strong>Permission Legend:</strong>
                <span className="ml-2 font-mono bg-green-100 text-green-800 px-1 rounded">PUBLIC</span> tanpa autentikasi,
                <span className="ml-2 font-mono bg-red-100 text-red-800 px-1 rounded">ADMIN</span> butuh autentikasi admin,
                <span className="ml-2 font-mono bg-orange-100 text-orange-800 px-1 rounded">SELF OR ADMIN</span> user sendiri atau admin
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
              <CardDescription>Enable or disable system features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Rate Limiting</Label>
                    <p className="text-sm text-muted-foreground">Enable rate limiting for API requests</p>
                  </div>
                  <Switch
                    checked={settings.enableRateLimit}
                    onCheckedChange={(checked) => handleSettingChange("enableRateLimit", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Logging</Label>
                    <p className="text-sm text-muted-foreground">Enable detailed system logging</p>
                  </div>
                  <Switch
                    checked={settings.enableLogging}
                    onCheckedChange={(checked) => handleSettingChange("enableLogging", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analytics</Label>
                    <p className="text-sm text-muted-foreground">Enable usage analytics and tracking</p>
                  </div>
                  <Switch
                    checked={settings.enableAnalytics}
                    onCheckedChange={(checked) => handleSettingChange("enableAnalytics", checked)}
                  />
                </div>
              </div>
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Features
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>Current system status and configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>System Version</Label>
                  <p className="text-sm font-mono">v2.1.4</p>
                </div>
                <div className="space-y-2">
                  <Label>Last Updated</Label>
                  <p className="text-sm">2024-01-15 10:30:00</p>
                </div>
                <div className="space-y-2">
                  <Label>Active Users</Label>
                  <p className="text-sm">1,234</p>
                </div>
                <div className="space-y-2">
                  <Label>Database Size</Label>
                  <p className="text-sm">2.4 GB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}