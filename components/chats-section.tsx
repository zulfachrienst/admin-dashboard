"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MessageSquare, Download, Trash2, User, Loader2, Search } from "lucide-react"
import { useApi } from "@/hooks/use-api"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

interface ChatUser {
  userId: string
  history: ChatMessage[]
}

interface UserStats {
  messageCount: number
  lastInteraction: string
  lastInteractionTimestamp: number
  userMessages: number
  assistantMessages: number
  isActive: boolean
}

export function ChatsSection() {
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [deletingHistory, setDeletingHistory] = useState<string | null>(null)

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Sorting states
  const [sortField, setSortField] = useState<keyof UserStats | "userId" | "">("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Chat history search
  const [historySearchTerm, setHistorySearchTerm] = useState("")

  const { apiCall } = useApi()

  const apiBaseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3001"
      : "https://chatbot-rag-9yyy.onrender.com"

  // Fetch chat users from API
  const fetchChatUsers = async () => {
    try {
      setLoading(true)

      const response = await apiCall(`${apiBaseUrl}/api/users`)

      if (response.ok) {
        const result = await response.json()
        const data: ChatUser[] = result.data
        setChatUsers(data)
        setError(null)
      } else {
        setError("Failed to fetch chat users")
      }
    } catch (err) {
      setError("Error connecting to API")
      console.error("Error fetching chat users:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChatUsers()
  }, [])

  // Calculate user statistics
  const getUserStats = (user: ChatUser): UserStats => {
    const messageCount = user.history.length
    const lastInteractionTimestamp = user.history.length > 0 ? Math.max(...user.history.map((msg) => msg.timestamp)) : 0

    const lastInteraction =
      user.history.length > 0 ? new Date(lastInteractionTimestamp).toLocaleString() : "No messages"

    const userMessages = user.history.filter((msg) => msg.role === "user").length
    const assistantMessages = user.history.filter((msg) => msg.role === "assistant").length

    const isActive = user.history.length > 0 && Date.now() - lastInteractionTimestamp < 24 * 60 * 60 * 1000

    return {
      messageCount,
      lastInteraction,
      lastInteractionTimestamp,
      userMessages,
      assistantMessages,
      isActive,
    }
  }

  // Sort and filter users
  const sortedAndFilteredUsers = (() => {
    const usersWithStats = chatUsers.map((user) => ({
      ...user,
      stats: getUserStats(user),
    }))

    // Apply search filter
    const filtered = usersWithStats.filter((user) => {
      const matchesSearch = user.userId.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.stats.isActive) ||
        (statusFilter === "inactive" && !user.stats.isActive)
      return matchesSearch && matchesStatus
    })

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any
        let bValue: any

        if (sortField === "userId") {
          aValue = a.userId.toLowerCase()
          bValue = b.userId.toLowerCase()
        } else {
          aValue = a.stats[sortField]
          bValue = b.stats[sortField]
        }

        // Handle string sorting
        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  })()

  // Calculate pagination
  const totalPages = Math.ceil(sortedAndFilteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedUsers = sortedAndFilteredUsers.slice(startIndex, startIndex + itemsPerPage)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const handleSort = (field: keyof UserStats | "userId") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  const getSortIcon = (field: keyof UserStats | "userId") => {
    if (sortField !== field) return "≡"
    return sortDirection === "asc" ? "↑" : "↓"
  }

  const handleViewHistory = (userId: string) => {
    setSelectedUser(userId)
    setIsHistoryOpen(true)
    setHistorySearchTerm("") // Reset history search when opening
  }

  const handleDeleteHistory = async (userId: string) => {
    if (
      !confirm(`Are you sure you want to delete all chat history for user ${userId}? This action cannot be undone.`)
    ) {
      return
    }

    try {
      setDeletingHistory(userId)

      const response = await apiCall(
        `${apiBaseUrl}/api/users/${encodeURIComponent(userId)}/history`,
        {
          method: "DELETE",
        },
      )

      if (response.ok) {
        await fetchChatUsers()
        setError(null)

        if (selectedUser === userId) {
          setIsHistoryOpen(false)
          setSelectedUser(null)
        }
      } else {
        const result = await response.json()
        setError(result.message || "Failed to delete chat history")
      }
    } catch (err) {
      setError("Error deleting chat history. Please check your connection.")
      console.error("Error deleting chat history:", err)
    } finally {
      setDeletingHistory(null)
    }
  }

  const handleExportChat = (userId: string, format: "csv" | "json") => {
    const user = chatUsers.find((u) => u.userId === userId)
    if (!user) return

    const filename = `chat_${userId.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.${format}`

    if (format === "json") {
      const dataStr = JSON.stringify(user.history, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } else {
      const csvContent = [
        "Timestamp,Role,Content",
        ...user.history.map((msg) => {
          const timestamp = new Date(msg.timestamp).toLocaleString()
          const content = msg.content.replace(/"/g, '""').replace(/\n/g, " ")
          return `"${timestamp}","${msg.role}","${content}"`
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
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Filter chat history based on search term
  const getFilteredHistory = () => {
    const selectedUserData = selectedUser ? chatUsers.find((u) => u.userId === selectedUser) : null
    if (!selectedUserData || !historySearchTerm) return selectedUserData?.history || []

    return selectedUserData.history.filter((message) =>
      message.content.toLowerCase().includes(historySearchTerm.toLowerCase()),
    )
  }

  const filteredHistory = getFilteredHistory()

  // Calculate overall statistics
  const totalUsers = chatUsers.length
  const activeUsers = chatUsers.filter((user) => getUserStats(user).isActive).length
  const totalMessages = chatUsers.reduce((sum, user) => sum + user.history.length, 0)
  const avgMessages = totalUsers > 0 ? Math.round(totalMessages / totalUsers) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
        <span className="ml-2 text-sm sm:text-base">Loading chat data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Chat Management</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Monitor and manage user conversations</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-sm sm:text-base">{error}</p>
            <Button variant="outline" onClick={fetchChatUsers} className="mt-2 text-sm sm:text-base">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered chat users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">Active in last 24h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalMessages}</div>
            <p className="text-xs text-muted-foreground">All time messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{avgMessages}</div>
            <p className="text-xs text-muted-foreground">Per user</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Chat Users</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            View all users who have interacted with the chatbot ({sortedAndFilteredUsers.length} of {totalUsers} users)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-sm sm:text-base"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="px-3 py-2 border rounded-md text-sm sm:text-base"
            >
              <option value="all">All Status</option>
              <option value="active">Active Users</option>
              <option value="inactive">Inactive Users</option>
            </select>
          </div>

          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-4">
            {paginatedUsers.map((user) => {
              const stats = user.stats
              return (
                <Card key={user.userId} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate" title={user.userId}>
                          {user.userId}
                        </h3>
                        <p className="text-xs text-muted-foreground">{stats.lastInteraction}</p>
                      </div>
                      <Badge variant={stats.isActive ? "default" : "secondary"} className="text-xs">
                        {stats.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Total:</span> {stats.messageCount}
                      </div>
                      <div>
                        <span className="text-muted-foreground">User:</span> {stats.userMessages}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bot:</span> {stats.assistantMessages}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewHistory(user.userId)}
                        disabled={user.history.length === 0}
                        className="flex-1 text-xs"
                      >
                        View History
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportChat(user.userId, "json")}
                        disabled={user.history.length === 0}
                        className="text-xs"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteHistory(user.userId)}
                        disabled={user.history.length === 0 || deletingHistory === user.userId}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        {deletingHistory === user.userId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort("userId")}>
                    <div className="flex items-center gap-1">User ID {getSortIcon("userId")}</div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("lastInteractionTimestamp")}
                  >
                    <div className="flex items-center gap-1">
                      Last Interaction {getSortIcon("lastInteractionTimestamp")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("messageCount")}
                  >
                    <div className="flex items-center gap-1">Messages {getSortIcon("messageCount")}</div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("isActive")}
                  >
                    <div className="flex items-center gap-1">Status {getSortIcon("isActive")}</div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => {
                  const stats = user.stats
                  return (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">
                        <div className="max-w-xs truncate" title={user.userId}>
                          {user.userId}
                        </div>
                      </TableCell>
                      <TableCell>{stats.lastInteraction}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{stats.messageCount} total</div>
                          <div className="text-muted-foreground">
                            {stats.userMessages} user, {stats.assistantMessages} bot
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={stats.isActive ? "default" : "secondary"}>
                          {stats.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewHistory(user.userId)}
                            disabled={user.history.length === 0}
                          >
                            View History
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportChat(user.userId, "json")}
                            disabled={user.history.length === 0}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteHistory(user.userId)}
                            disabled={user.history.length === 0 || deletingHistory === user.userId}
                            className="text-red-600 hover:text-red-700"
                          >
                            {deletingHistory === user.userId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedAndFilteredUsers.length)} of{" "}
                {sortedAndFilteredUsers.length} users
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="text-sm"
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0 text-sm"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="text-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {paginatedUsers.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== "all" ? "No users match your filters" : "No chat users found"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chat History - {selectedUser}</DialogTitle>
            <DialogDescription>
              Conversation history for this user ({filteredHistory.length} {historySearchTerm ? "filtered" : "total"}{" "}
              messages)
            </DialogDescription>
          </DialogHeader>

          {/* History Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in chat history..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredHistory.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900 border"
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{message.role === "user" ? "User" : "Assistant"}</span>
                    <span className="text-xs opacity-70">{formatTimestamp(message.timestamp)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {filteredHistory.length === 0 && historySearchTerm && (
              <div className="text-center py-8 text-muted-foreground">No messages match your search</div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => selectedUser && handleExportChat(selectedUser, "csv")} className="text-sm">
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => selectedUser && handleExportChat(selectedUser, "json")} className="text-sm">
              Export JSON
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUser && handleDeleteHistory(selectedUser)}
              disabled={deletingHistory === selectedUser}
              className="text-sm"
            >
              {deletingHistory === selectedUser ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete History
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}