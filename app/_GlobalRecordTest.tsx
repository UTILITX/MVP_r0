"use client"

import { testInsertRecord } from "./workspace/actions"

export default function GlobalRecordTest() {
  async function insertTestRecord() {
    try {
      const result = await testInsertRecord()

      console.log("[v0] insertTestRecord →", result)

      if (result.error) {
        alert(`❌ ${result.error}`)
      } else {
        alert(`✅ record id: ${result.data?.id}`)
      }
    } catch (err) {
      console.error("[v0] insertTestRecord error:", err)
      alert(`❌ ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  return (
    <div style={{ position: "fixed", right: 16, bottom: 80, zIndex: 999999 }}>
      <button
        onClick={insertTestRecord}
        style={{
          background: "#60a5fa",
          color: "#111",
          padding: "10px 14px",
          borderRadius: 10,
          fontWeight: 800,
          border: "none",
          cursor: "pointer",
        }}
      >
        📄 INSERT TEST RECORD
      </button>
    </div>
  )
}
