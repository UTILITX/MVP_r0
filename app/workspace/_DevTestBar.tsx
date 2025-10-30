"use client"

import { insertTestPolygon } from "./actions"

export default function DevTestBar() {
  async function handleClick() {
    console.log("[v0] Client: Test button clicked")
    const result = await insertTestPolygon()
    console.log("[v0] Client: Result from server →", result)
    alert(result.success ? `✅ ${result.message}` : `❌ ${result.message}`)
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: "auto 16px 16px auto",
        zIndex: 9999,
        background: "#111",
        color: "#fff",
        padding: "10px 12px",
        borderRadius: 12,
        boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
      }}
    >
      <button
        onClick={handleClick}
        style={{
          background: "#22c55e",
          color: "#111",
          padding: "8px 12px",
          borderRadius: 8,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
        }}
      >
        ➕ Insert Test Polygon
      </button>
    </div>
  )
}
