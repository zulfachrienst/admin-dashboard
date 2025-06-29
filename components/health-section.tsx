"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, AlertCircle, Clock, Database, Zap, Loader2, Play, PlayCircle } from "lucide-react"

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

interface TestResponse {
  success: boolean
  data: {
    uptime: number
    avgResponse: number
    successCount: number
    maxRetries: number
  }
}

interface ServiceConfig {
  name: string
  key: keyof HealthStatusResponse["data"]
  endpoint: string
  icon: React.ElementType
  description: string
}

const apiBaseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "https://chatbot-rag-9yyy.onrender.com"

const services: ServiceConfig[] = [
  {
    name: "Firebase Database",
    key: "firebase",
    endpoint: `${apiBaseUrl}/api/health/test/firebase`,
    icon: Database,
    description: "Firestore Database Connection",
  },
  {
    name: "GROQ AI API",
    key: "groq",
    endpoint: `${apiBaseUrl}/api/health/test/groq`,
    icon: Zap,
    description: "AI Language Model Service",
  },
  {
    name: "Pinecone Vector DB",
    key: "pinecone",
    endpoint: `${apiBaseUrl}/api/health/test/pinecone`,
    icon: Database,
    description: "Vector Database for Embeddings",
  },
  {
    name: "HuggingFace Inference",
    key: "huggingface",
    endpoint: `${apiBaseUrl}/api/health/test/huggingface`,
    icon: Zap,
    description: "Sentence Embedding Service",
  },
]

export function HealthSection() {
  const [healthData, setHealthData] = useState<HealthStatusResponse["data"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testingServices, setTestingServices] = useState<Set<string>>(new Set())
  const [testingAll, setTestingAll] = useState(false)
  const [currentTestingService, setCurrentTestingService] = useState<string | null>(null)

  // Fetch health status from API (hanya untuk initial load)
  const fetchHealthStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${apiBaseUrl}/api/health/status`)
      const result: HealthStatusResponse = await response.json()

      if (result.success) {
        setHealthData(result.data)
        setError(null)
      } else {
        setError("Failed to fetch health status")
      }
    } catch (err) {
      setError("Error connecting to health API")
      console.error("Error fetching health status:", err)
    } finally {
      setLoading(false)
    }
  }

  // Update individual service data tanpa refresh
  const updateServiceData = async (serviceKey: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/health/status`)
      const result: HealthStatusResponse = await response.json()

      if (result.success && result.data[serviceKey]) {
        setHealthData((prevData) => {
          if (!prevData) return result.data
          return {
            ...prevData,
            [serviceKey]: result.data[serviceKey],
          }
        })
      }
    } catch (err) {
      console.error(`Error updating ${serviceKey} data:`, err)
    }
  }

  useEffect(() => {
    fetchHealthStatus()
    // Hapus auto refresh
  }, [])

  // Test individual service
  const testService = async (serviceKey: string, endpoint: string) => {
    try {
      setTestingServices((prev) => new Set(prev).add(serviceKey))

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serviceKey }),
      })

      const result: TestResponse = await response.json()

      if (result.success) {
        // Update data untuk service ini saja tanpa refresh
        await updateServiceData(serviceKey)
        setError(null)
      } else {
        setError(`Failed to test ${serviceKey} service`)
      }
    } catch (err) {
      setError(`Error testing ${serviceKey} service`)
      console.error(`Error testing ${serviceKey}:`, err)
    } finally {
      setTestingServices((prev) => {
        const newSet = new Set(prev)
        newSet.delete(serviceKey)
        return newSet
      })
    }
  }

  // Test all services secara berurutan
  const testAllServices = async () => {
    try {
      setTestingAll(true)
      setError(null)

      // Test services satu per satu secara berurutan
      for (const service of services) {
        setCurrentTestingService(service.key)
        setTestingServices((prev) => new Set(prev).add(service.key))

        try {
          const response = await fetch(service.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ serviceKey: service.key }),
          })

          const result: TestResponse = await response.json()

          if (result.success) {
            // Update data untuk service ini langsung tanpa refresh
            await updateServiceData(service.key)
          } else {
            setError(`Failed to test ${service.key} service`)
          }
        } catch (err) {
          console.error(`Error testing ${service.key}:`, err)
          setError(`Error testing ${service.key} service`)
        } finally {
          // Remove loading state untuk service ini
          setTestingServices((prev) => {
            const newSet = new Set(prev)
            newSet.delete(service.key)
            return newSet
          })
        }

        // Delay kecil antar test untuk UX yang lebih smooth
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } catch (err) {
      setError("Error testing services")
      console.error("Error testing all services:", err)
    } finally {
      setTestingAll(false)
      setCurrentTestingService(null)
    }
  }

  const getServiceStatus = (serviceData: ServiceData) => {
    if (!serviceData) return { status: "unknown", color: "gray" }

    const uptime = serviceData.uptime || 0
    if (uptime >= 95) return { status: "healthy", color: "green" }
    if (uptime >= 80) return { status: "warning", color: "yellow" }
    return { status: "error", color: "red" }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatTimestamp = (timestamp: { _seconds: number; _nanoseconds: number }) => {
    return new Date(timestamp._seconds * 1000).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading health status...</span>
      </div>
    )
  }

  if (!healthData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">No health data available</p>
          <Button onClick={fetchHealthStatus} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Calculate overall statistics
  const serviceStats = services.map((service) => {
    const data = healthData[service.key] as ServiceData
    return {
      ...service,
      data,
      status: getServiceStatus(data),
    }
  })

  const healthyServices = serviceStats.filter((s) => s.status.status === "healthy").length
  const totalServices = services.length
  const overallHealth = (healthyServices / totalServices) * 100
  const avgResponseTime = Math.round(
    serviceStats.reduce((sum, s) => sum + (s.data?.avgResponse || 0), 0) / totalServices,
  )
  const avgUptime = serviceStats.reduce((sum, s) => sum + (s.data?.uptime || 0), 0) / totalServices

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Health Monitor</h2>
          <p className="text-muted-foreground">Real-time monitoring of all system services</p>
        </div>
        <Button onClick={testAllServices} disabled={testingAll} className="bg-blue-600 hover:bg-blue-700">
          {testingAll ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing All Services...
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Test All Services
            </>
          )}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" onClick={fetchHealthStatus} className="mt-2">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress indicator saat test all services */}
      {testingAll && currentTestingService && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <p className="text-blue-600">
                Currently testing:{" "}
                <span className="font-medium">
                  {services.find((s) => s.key === currentTestingService)?.name || currentTestingService}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
            {getStatusIcon(overallHealth > 90 ? "healthy" : overallHealth > 70 ? "warning" : "error")}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallHealth.toFixed(1)}%</div>
            <Progress value={overallHealth} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {healthyServices}/{totalServices} services healthy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">Across all services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Online</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthyServices}</div>
            <p className="text-xs text-muted-foreground">Out of {totalServices} services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUptime.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Average uptime</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Real-time status of all system components and external services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {serviceStats.map((service) => {
              const IconComponent = service.icon
              const isTestingThis = testingServices.has(service.key)
              const isCurrentlyTesting = currentTestingService === service.key
              return (
                <div
                  key={service.key}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-300 ${isCurrentlyTesting ? "border-blue-300 bg-blue-50" : ""
                    }`}
                >
                  <div className="flex items-center space-x-4">
                    <IconComponent className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      {service.data?.lastTested && (
                        <p className="text-xs text-muted-foreground">
                          Last tested: {formatTimestamp(service.data.lastTested)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(service.status.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testService(service.key, service.endpoint)}
                        disabled={isTestingThis || testingAll}
                      >
                        {isTestingThis ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Test Service
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {service.data && (
                        <>
                          <div>Uptime: {service.data.uptime}%</div>
                          <div>Response: {service.data.avgResponse}ms</div>
                          <div>
                            Success: {service.data.successCount}/{service.data.maxRetries}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Service Performance</CardTitle>
            <CardDescription>Key performance indicators for each service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceStats.map((service) => (
                <div key={service.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{service.name}</span>
                    <span>{service.data?.uptime || 0}%</span>
                  </div>
                  <Progress value={service.data?.uptime || 0} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Times</CardTitle>
            <CardDescription>Average response times for each service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceStats.map((service) => (
                <div key={service.key} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{service.name}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold">{service.data?.avgResponse || 0}ms</div>
                    <div className="text-xs text-muted-foreground">
                      {service.data?.avgResponse && service.data.avgResponse < 500
                        ? "Excellent"
                        : service.data?.avgResponse && service.data.avgResponse < 1000
                          ? "Good"
                          : "Slow"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
