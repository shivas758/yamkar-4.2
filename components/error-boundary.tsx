"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-[#E2725B]">Something went wrong!</h2>
        <p className="text-muted-foreground">We apologize for the inconvenience. Please try again.</p>
        <Button onClick={reset} className="bg-[#228B22] hover:bg-[#1a6b1a]">
          Try again
        </Button>
      </div>
    </div>
  )
}

