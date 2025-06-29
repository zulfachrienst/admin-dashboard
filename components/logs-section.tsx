"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Eye, Download, RefreshCw, Loader2, Trash2 } from "lucide-react"
import { useApi } from "@/hooks/use-api"

interface LogEntry {
  timestamp: {
    _seconds: number
    _nanoseconds: number
  }
  source: string
  user_id?: string
  request_id: string
  endpoint?: string
  response_time?: number
  message: string
  details?: any
  level: "INFO" | "WARN" | "ERROR"
  // Error specific fields
  severity?: "HIGH" | "MEDIUM" | "LOW"
  code?: string
  stack?: string
  httpStatus?: number
  userId?: string
  requestId?: string
  userAgent?: string
  ip?: string
  additionalContext?: any
}

interface SystemLogsResponse {
  success: boolean
  data: LogEntry[]
  nextPageToken?: string | null
}

// Debounce hook untuk input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Memoized Clear Dialog Component
const ClearLogsDialog = memo(
  ({
    isOpen,
    onClose,
    clearOptions,
    onClearOptionsChange,
    onClear,
    isClearing,
  }: {
    isOpen: boolean
    onClose: () => void
    clearOptions: {
      olderThan: string
      timeUnit: "hours" | "days"
      level: string
      confirmText: string
    }
    onClearOptionsChange: (updates: Partial<typeof clearOptions>) => void
    onClear: () => void
    isClearing: boolean
  }) => {
    // Debounce confirmation text untuk mengurangi re-renders
    const debouncedConfirmText = useDebounce(clearOptions.confirmText, 300)
    const isConfirmValid = debouncedConfirmText === "CLEAR LOGS"

    const timeOptions = useMemo(() => {
      if (clearOptions.timeUnit === "hours") {
        return [
          { value: "1", label: "1 hour" },
          { value: "6", label: "6 hours" },
          { value: "12", label: "12 hours" },
          { value: "24", label: "24 hours" },
        ]
      } else {
        return [
          { value: "1", label: "1 day" },
          { value: "3", label: "3 days" },
          { value: "7", label: "7 days" },
          { value: "14", label: "14 days" },
          { value: "30", label: "30 days" },
          { value: "90", label: "90 days" },
        ]
      }
    }, [clearOptions.timeUnit])

    const warningText = useMemo(() => {
      const timeText =
        clearOptions.timeUnit === "hours"
          ? `${clearOptions.olderThan} hour${clearOptions.olderThan !== "1" ? "s" : ""}`
          : `${clearOptions.olderThan} day${clearOptions.olderThan !== "1" ? "s" : ""}`

      return `This will delete logs ${clearOptions.level === "ALL" ? "of all levels" : `with level ${clearOptions.level}`
        } older than ${timeText}.`
    }, [clearOptions.olderThan, clearOptions.timeUnit, clearOptions.level])

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">⚠️ Clear System Logs</DialogTitle>
            <DialogDescription>
              This action will permanently delete logs from the database. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Time unit:</label>
              <select
                value={clearOptions.timeUnit}
                onChange={(e) =>
                  onClearOptionsChange({
                    timeUnit: e.target.value as "hours" | "days",
                    olderThan: "1", // Reset to 1 when changing unit
                  })
                }
                className="w-full mt-1 px-3 py-2 border rounded-md"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Clear logs older than:</label>
              <select
                value={clearOptions.olderThan}
                onChange={(e) => onClearOptionsChange({ olderThan: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              >
                {timeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Log level to clear:</label>
              <select
                value={clearOptions.level}
                onChange={(e) => onClearOptionsChange({ level: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              >
                <option value="ALL">All Levels</option>
                <option value="INFO">INFO only</option>
                <option value="WARN">WARN only</option>
                <option value="ERROR">ERROR only</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-red-600">Type "CLEAR LOGS" to confirm:</label>
              <Input
                value={clearOptions.confirmText}
                onChange={(e) => onClearOptionsChange({ confirmText: e.target.value })}
                placeholder="CLEAR LOGS"
                className="mt-1"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> {warningText}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isClearing} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onClear} disabled={isClearing || !isConfirmValid} className="flex-1">
              {isClearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                "Clear Logs"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  },
)

ClearLogsDialog.displayName = "ClearLogsDialog"

export function LogsSection() {
  // ... existing state declarations
  const { apiCall } = useApi()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL")
  const [sourceFilter, setSourceFilter] = useState("")
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Pagination state
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [previousTokens, setPreviousTokens] = useState<string[]>([])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [itemsPerPage] = useState(50)

  // Clear logs state - simplified
  const [clearingLogs, setClearingLogs] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [clearOptions, setClearOptions] = useState({
    olderThan: "7",
    timeUnit: "days" as "hours" | "days",
    level: "ALL",
    confirmText: "",
  })

  const apiBaseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3001"
      : "https://chatbot-rag-9yyy.onrender.com"

  // Fetch logs from API
  const fetchLogs = useCallback(
    async (startAfter?: string, isNextPage = false) => {
      try {
        setLoading(true)
        setError(null)

        // Build query parameters
        const params = new URLSearchParams()
        params.append("limit", itemsPerPage.toString())
        if (startAfter) {
          params.append("startAfter", startAfter)
        }

        const response = await apiCall(`${apiBaseUrl}/api/system-logs?${params}`, {
          method: "GET",
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setLogs(result.data)
            setNextPageToken(result.nextPageToken)
            setHasNextPage(result.data.length === itemsPerPage)

            // Track pagination tokens for "Previous" functionality
            if (isNextPage && startAfter) {
              setPreviousTokens((prev) => [...prev, startAfter])
              setCurrentPageIndex((prev) => prev + 1)
            }
          } else {
            setError("Failed to fetch logs")
          }
        }
      } catch (err) {
        setError("Error connecting to API")
        console.error("Error fetching logs:", err)
      } finally {
        setLoading(false)
      }
    },
    [itemsPerPage, apiCall],
  )

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Get unique sources for filter - memoized
  const uniqueSources = useMemo(() => Array.from(new Set(logs.map((log) => log.source))), [logs])

  // Filter and search logs - memoized
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.user_id && log.user_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.userId && log.userId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.request_id && log.request_id.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesLevel = levelFilter === "ALL" || log.level === levelFilter
      const matchesSource = !sourceFilter || log.source === sourceFilter

      return matchesSearch && matchesLevel && matchesSource
    })
  }, [logs, searchTerm, levelFilter, sourceFilter])

  // Reset to first page when filters change
  useEffect(() => {
    setPreviousTokens([])
    setCurrentPageIndex(0)
    fetchLogs()
  }, [levelFilter, sourceFilter, fetchLogs])

  const getLevelBadge = useCallback((log: LogEntry) => {
    // For ERROR level, show severity if available
    if (log.level === "ERROR" && log.severity) {
      switch (log.severity) {
        case "HIGH":
          return (
            <Badge variant="destructive" className="min-w-[50px] justify-center">
              HIGH
            </Badge>
          )
        case "MEDIUM":
          return (
            <Badge variant="default" className="min-w-[50px] justify-center bg-orange-100 text-orange-800">
              MED
            </Badge>
          )
        case "LOW":
          return (
            <Badge variant="secondary" className="min-w-[50px] justify-center">
              LOW
            </Badge>
          )
      }
    }

    // Default level badges
    switch (log.level) {
      case "ERROR":
        return (
          <Badge variant="destructive" className="min-w-[50px] justify-center">
            ERROR
          </Badge>
        )
      case "WARN":
        return (
          <Badge variant="default" className="min-w-[50px] justify-center bg-yellow-100 text-yellow-800">
            WARN
          </Badge>
        )
      case "INFO":
        return (
          <Badge variant="secondary" className="min-w-[50px] justify-center">
            INFO
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="min-w-[50px] justify-center">
            {log.level}
          </Badge>
        )
    }
  }, [])

  const formatTimestamp = useCallback((timestamp: { _seconds: number; _nanoseconds: number }) => {
    const date = new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000)
    return date.toLocaleString()
  }, [])

  const handleViewDetails = useCallback((log: LogEntry) => {
    setSelectedLog(log)
    setIsDetailOpen(true)
  }, [])

  const handleExportLogs = useCallback(
    (format: "csv" | "json") => {
      const filename = `system_logs_${new Date().toISOString().split("T")[0]}.${format}`

      if (format === "json") {
        const dataStr = JSON.stringify(filteredLogs, null, 2)
        const dataBlob = new Blob([dataStr], { type: "application/json" })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
      } else {
        const csvContent = [
          "Timestamp,Level,Source,Message,User ID,Endpoint,Response Time,Request ID",
          ...filteredLogs.map((log) => {
            const timestamp = formatTimestamp(log.timestamp)
            const message = log.message.replace(/"/g, '""').replace(/\n/g, " ")
            const userId = log.user_id || log.userId || ""
            return `"${timestamp}","${log.level}","${log.source}","${message}","${userId}","${log.endpoint || ""}","${log.response_time || ""}","${log.request_id}"`
          }),
        ].join("\n")
        const dataBlob = new Blob([csvContent], { type: "text/csv" })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
      }
    },
    [filteredLogs, formatTimestamp],
  )

  const refreshLogs = useCallback(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleNextPage = useCallback(() => {
    if (nextPageToken && hasNextPage) {
      const tokenToUse =
        typeof nextPageToken === "object" ? new Date(nextPageToken._seconds * 1000).toISOString() : nextPageToken
      fetchLogs(tokenToUse, true)
    }
  }, [nextPageToken, hasNextPage, fetchLogs])

  const handlePreviousPage = useCallback(() => {
    if (currentPageIndex > 0) {
      const prevToken = previousTokens[currentPageIndex - 1]
      setPreviousTokens((prev) => prev.slice(0, -1))
      setCurrentPageIndex((prev) => prev - 1)
      if (prevToken) {
        fetchLogs(prevToken, false)
      } else {
        fetchLogs()
      }
    }
  }, [currentPageIndex, previousTokens, fetchLogs])

  const handleFirstPage = useCallback(() => {
    setPreviousTokens([])
    setCurrentPageIndex(0)
    fetchLogs()
  }, [fetchLogs])

  // Clear logs handler
  const handleClearLogs = useCallback(async () => {
    if (clearOptions.confirmText !== "CLEAR LOGS") {
      return
    }

    try {
      setClearingLogs(true)

      // Convert time to hours for API
      let timeInHours: number
      if (clearOptions.timeUnit === "hours") {
        timeInHours = Number.parseInt(clearOptions.olderThan)
      } else {
        timeInHours = Number.parseInt(clearOptions.olderThan) * 24
      }

      const requestBody = {
        olderThanHours: timeInHours, // Send in hours to API
        level: clearOptions.level,
      }

      const response = await apiCall(`${apiBaseUrl}/api/clear-logs`, {
        method: "DELETE",
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setShowClearDialog(false)
          setClearOptions({ olderThan: "7", timeUnit: "days", level: "ALL", confirmText: "" })
          handleFirstPage()
          alert(`Successfully cleared ${result.deletedCount || 0} logs`)
        } else {
          setError(result.message || "Failed to clear logs")
        }
      } else {
        setError("Failed to clear logs")
      }
    } catch (err) {
      setError("Error clearing logs")
      console.error("Error clearing logs:", err)
    } finally {
      setClearingLogs(false)
    }
  }, [clearOptions, handleFirstPage, apiCall])

  // Optimized clear options handler
  const handleClearOptionsChange = useCallback((updates: Partial<typeof clearOptions>) => {
    setClearOptions((prev) => ({ ...prev, ...updates }))
  }, [])

  // Close clear dialog handler
  const handleCloseClearDialog = useCallback(() => {
    setShowClearDialog(false)
    setClearOptions({ olderThan: "7", timeUnit: "days", level: "ALL", confirmText: "" })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading system logs...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Logs</h2>
          <p className="text-muted-foreground">Monitor all system activities and events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => handleExportLogs("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExportLogs("json")}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowClearDialog(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Logs
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" onClick={refreshLogs} className="mt-2">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            All system events and activities ({filteredLogs.length} of {logs.length} logs)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as "ALL" | "INFO" | "WARN" | "ERROR")}
              className="px-3 py-2 border rounded-md"
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">All Sources</option>
              {uniqueSources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log, index) => (
                <TableRow key={`${log.request_id}-${index}`}>
                  <TableCell className="font-mono text-xs">{formatTimestamp(log.timestamp)}</TableCell>
                  <TableCell>{getLevelBadge(log)}</TableCell>
                  <TableCell className="font-medium">{log.source}</TableCell>
                  <TableCell>
                    <div className="max-w-md truncate" title={log.message}>
                      {log.message}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.user_id || log.userId ? (
                      <div className="max-w-20 truncate" title={log.user_id || log.userId}>
                        {log.user_id || log.userId}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.response_time ? (
                      <span
                        className={`font-mono text-xs ${log.response_time > 1000
                            ? "text-red-600"
                            : log.response_time > 500
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                      >
                        {log.response_time}ms
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPageIndex + 1} • Showing {logs.length} logs
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFirstPage}
                disabled={currentPageIndex === 0 || loading}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPageIndex === 0 || loading}
              >
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!hasNextPage || loading}>
                Next
              </Button>
            </div>
          </div>

          {filteredLogs.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || levelFilter !== "ALL" || sourceFilter ? "No logs match your filters" : "No logs found"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>Detailed information for log entry</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="font-mono text-sm">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Level</label>
                  <div className="mt-1">{getLevelBadge(selectedLog)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Source</label>
                  <p className="text-sm">{selectedLog.source}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Request ID</label>
                  <p className="font-mono text-sm">{selectedLog.request_id || selectedLog.requestId || "-"}</p>
                </div>
                {(selectedLog.user_id || selectedLog.userId) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                    <p className="font-mono text-sm">{selectedLog.user_id || selectedLog.userId}</p>
                  </div>
                )}
                {selectedLog.endpoint && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Endpoint</label>
                    <p className="font-mono text-sm">{selectedLog.endpoint}</p>
                  </div>
                )}
                {selectedLog.ip && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                    <p className="font-mono text-sm">{selectedLog.ip}</p>
                  </div>
                )}
                {selectedLog.response_time && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Response Time</label>
                    <p className="font-mono text-sm">{selectedLog.response_time}ms</p>
                  </div>
                )}
                {selectedLog.httpStatus && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">HTTP Status</label>
                    <p className="font-mono text-sm">{selectedLog.httpStatus}</p>
                  </div>
                )}
                {selectedLog.code && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Error Code</label>
                    <p className="font-mono text-sm">{selectedLog.code}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Message</label>
                <p className="text-sm mt-1 p-3 bg-gray-50 rounded border">{selectedLog.message}</p>
              </div>

              {selectedLog.details && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Details</label>
                  <pre className="text-sm mt-1 p-3 bg-gray-50 rounded border whitespace-pre-wrap overflow-x-auto">
                    {typeof selectedLog.details === "object"
                      ? JSON.stringify(selectedLog.details, null, 2)
                      : selectedLog.details}
                  </pre>
                </div>
              )}

              {selectedLog.stack && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stack Trace</label>
                  <pre className="font-mono text-xs mt-1 p-3 bg-gray-50 rounded border whitespace-pre-wrap overflow-x-auto">
                    {selectedLog.stack}
                  </pre>
                </div>
              )}

              {selectedLog.additionalContext && Object.keys(selectedLog.additionalContext).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Additional Context</label>
                  <pre className="text-sm mt-1 p-3 bg-gray-50 rounded border whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(selectedLog.additionalContext, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                  <p className="font-mono text-xs mt-1 p-3 bg-gray-50 rounded border break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear Logs Dialog - Now Memoized */}
      <ClearLogsDialog
        isOpen={showClearDialog}
        onClose={handleCloseClearDialog}
        clearOptions={clearOptions}
        onClearOptionsChange={handleClearOptionsChange}
        onClear={handleClearLogs}
        isClearing={clearingLogs}
      />
    </div>
  )
}
