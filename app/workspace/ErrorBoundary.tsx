"use client"
import { Component, type ReactNode } from "react"

export default class ErrorBoundary extends Component<{ children: ReactNode }, { err?: any }> {
  state = { err: null as any }

  static getDerivedStateFromError(err: any) {
    return { err }
  }

  componentDidCatch(err: any, info: any) {
    console.error("[v0] Workspace crash:", err, info)
  }

  render() {
    if (this.state.err) {
      return (
        <div className="p-4 text-red-600">
          <h2 className="font-semibold mb-2">Workspace failed to load</h2>
          <pre className="text-xs bg-red-50 p-2 rounded overflow-auto">{this.state.err.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
