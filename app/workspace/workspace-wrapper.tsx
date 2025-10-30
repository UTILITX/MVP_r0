"use client"

import dynamic from "next/dynamic"
import ErrorBoundary from "./ErrorBoundary"

const WorkspaceClient = dynamic(() => import("@/components/workspace-client"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Loading workspace...</p>
      </div>
    </div>
  ),
})

export default function WorkspaceWrapper() {
  return (
    <ErrorBoundary>
      <WorkspaceClient />
    </ErrorBoundary>
  )
}
