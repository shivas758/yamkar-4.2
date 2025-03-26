"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import type { ApiResponse } from "@/types"

interface UseFetchOptions<T> {
  url: string
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: any
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
}

export function useFetch<T>({ url, method = "GET", body, onSuccess, onError }: UseFetchOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        })

        const result: ApiResponse<T> = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Something went wrong")
        }

        if (result.data) {
          setData(result.data)
          onSuccess?.(result.data)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong"
        setError(message)
        onError?.(message)
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [url, method, body, onSuccess, onError, toast])

  return { data, error, isLoading }
}

