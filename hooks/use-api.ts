"use client"

import { useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"

/**
 * Hook that returns a typed apiCall helper which automatically:
 * • injects the Firebase ID token as Bearer header
 * • avoids setting Content-Type when the body is FormData (so the browser can add the boundary)
 */
export function useApi() {
  const { getAuthToken } = useAuth()

  const apiCall = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      // Retrieve a fresh token (if user is logged-in)
      const token = await getAuthToken?.()

      const isFormData = options.body instanceof FormData

      // Compose headers
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      }

      if (!isFormData) {
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json"
      }

      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      // Perform the request
      const response = await fetch(url, {
        ...options,
        headers,
      })

      return response
    },
    [getAuthToken],
  )

  return { apiCall }
}
