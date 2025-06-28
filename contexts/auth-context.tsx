"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { type User, signInWithEmailAndPassword, signOut, onAuthStateChanged, getIdToken } from "firebase/auth"
import { auth } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  getAuthToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)

      // Log authentication state changes
      if (user) {
        console.log("User signed in:", user.email)
      } else {
        console.log("User signed out")
      }
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      // Get ID token for API calls
      const idToken = await getIdToken(userCredential.user)

      // Store token in localStorage for API calls
      localStorage.setItem("firebase_token", idToken)

      console.log("Login successful:", userCredential.user.email)
    } catch (error: any) {
      console.error("Login error:", error)
      throw new Error(error.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      await signOut(auth)

      // Clear stored token
      localStorage.removeItem("firebase_token")
      localStorage.removeItem("token") // Clear old JWT token if exists

      console.log("Logout successful")
    } catch (error: any) {
      console.error("Logout error:", error)
      throw new Error(error.message || "Logout failed")
    } finally {
      setLoading(false)
    }
  }

  const getAuthToken = async (): Promise<string | null> => {
    if (!user) return null

    try {
      // Get fresh ID token
      const idToken = await getIdToken(user, true) // force refresh

      // Update stored token
      localStorage.setItem("firebase_token", idToken)

      return idToken
    } catch (error) {
      console.error("Error getting auth token:", error)
      return null
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    getAuthToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
