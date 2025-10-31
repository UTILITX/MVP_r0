"use client"

import { useEffect } from "react"
import { useMemo, useState, useRef } from "react"
// ... [rest of the imports and logic]

export default function UploadTab({ records, setRecords, preloadedPolygon, preloadedAreaSqMeters }: Props) {
  // ... [all your state declarations and functions here]

  // ✅ Add this new function near the end of your component
  async function uploadFilesToBackend() {
    const workAreaId = sessionStorage.getItem("workAreaId")
    if (!workAreaId) {
      toast({ title: "Missing work area ID", description: "Save polygon first.", variant: "destructive" })
      return
    }

    for (const file of uploadedFiles) {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("workAreaId", workAreaId)
      formData.append("metadata", JSON.stringify({
        utilityType: selectedUtilityType,
        recordType: selectedRecordType,
        geometryType: selectedGeometryType,
        notes,
        orgName,
        uploaderName
      }))

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      })

      const json = await res.json()
      if (!json.ok) {
        toast({ title: "Upload failed", description: json.error, variant: "destructive" })
      } else {
        toast({ title: "Upload successful", description: file.name })
      }
    }
  }

  // ✅ Call uploadFilesToBackend after georeference is complete or before completeUpload()

  // Replace this line in handleCompleteUpload:
  // completeUpload()
  // With this:
  const handleCompleteUpload = async () => {
    await uploadFilesToBackend()
    completeUpload()
  }

  return (
    // ... [your full JSX returned component]
  )
}

// ... [your helper functions at the bottom stay unchanged] (hasFiles, extractFiles, centroidOfPath)