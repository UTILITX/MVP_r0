"use client"
import ExistingWorkAreasLayer from "@/components/layers/ExistingWorkAreasLayer";
import type React from "react"
import { hasFiles, extractFiles } from "@/utils/file-utils" // Import hasFiles and extractFiles

import { useEffect, useRef, useState, useCallback } from "react"
import type { LatLng } from "@/lib/record-types"
import { useToast } from "@/hooks/use-toast"

type Mode = "draw" | "view"
type GeorefMode = "none" | "point" | "line" | "polygon"

export type MapMarker = {
  id: string
  position: LatLng
  title: string
  description?: string
  iconUrl?: string
  iconSize?: number
}

export type MapBubble = {
  id: string
  position: LatLng
  title: string
  description?: string
  recordLabel: string
  size?: number
  offsetX?: number
  offsetY?: number
}

export type GeorefShape = {
  id: string
  type: "LineString" | "Polygon"
  path: LatLng[]
  title?: string
  description?: string
  strokeColor?: string
  fillColor?: string
}

type Props = {
  mode?: Mode
  polygon?: LatLng[] | null
  onPolygonChange?: (path: LatLng[] | null, areaSqMeters?: number | null) => void
  center?: LatLng
  zoom?: number
  maxAreaSqMeters?: number

  georefMode?: GeorefMode
  onGeorefComplete?: (
    result: { type: "Point"; point: LatLng } | { type: "LineString" | "Polygon"; path: LatLng[] },
  ) => void
  onCancelGeoref?: () => void
  georefColor?: string

  pickPointActive?: boolean
  pickZoom?: number
  onPickPoint?: (latlng: LatLng) => void

  markers?: MapMarker[]
  bubbles?: MapBubble[]
  shapes?: GeorefShape[]

  enableDrop?: boolean
  onDropFilesAt?: (latlng: LatLng, files: File[]) => void
  focusPoint?: LatLng | null
  focusZoom?: number

  existingPolygons?: GeorefShape[]

}

// Tile-based map implementation
export function MapWithDrawing({
  mode = "draw",
  polygon = null,
  onPolygonChange = () => {},
  center = { lat: 43.6532, lng: -79.3832 }, // Toronto
  zoom = 10,
  maxAreaSqMeters = 10_000_000,
  georefMode = "none",
  onGeorefComplete,
  georefColor,
  pickPointActive = false,
  pickZoom = 16,
  onPickPoint,
  markers = [],
  bubbles = [],
  shapes = [],
  enableDrop = false,
  onDropFilesAt,
  focusPoint = null,
  focusZoom = 16,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingPath, setDrawingPath] = useState<LatLng[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null)
  const dragDepthRef = useRef(0)
  const [openInfo, setOpenInfo] = useState<{
    id: string
    position: LatLng
    title: string
    description?: string
  } | null>(null)

  // Map viewport state
  const [viewport, setViewport] = useState({
    centerLat: center.lat,
    centerLng: center.lng,
    zoom: zoom,
  })

  // Tile cache
  const tileCache = useRef<Map<string, HTMLImageElement>>(new Map())
  const [tilesLoaded, setTilesLoaded] = useState(0)

  const [polygonDrawMode, setPolygonDrawMode] = useState(false)

  //Layers
//<ExistingWorkAreasLayer onSelect={(wa) => setSelectedWorkArea(wa)} />
const [existingPolygons, setExistingPolygons] = useState<GeorefShape[]>([]);

useEffect(() => {
  async function fetchExisting() {
    try {
      const res = await fetch("/api/work-areas");
      const { work_areas } = await res.json();

      const shapes: GeorefShape[] = work_areas.map((wa: any) => ({
        id: wa.id,
        type: "Polygon",
        path: wa.geojson.coordinates[0].map(([lng, lat]: [number, number]) => ({ lat, lng })),
        title: wa.name,
        description: `Created: ${new Date(wa.created_at).toLocaleString()}`,
        strokeColor: "#3b82f6",
        fillColor: "rgba(59, 130, 246, 0.1)",
      }));

      setExistingPolygons(shapes);
    } catch (err) {
      console.error("Failed to load existing work areas", err);
    }
  }

  fetchExisting();
}, []);


  // Convert lat/lng to pixel coordinates (Web Mercator)
  const latLngToPixel = useCallback(
    (lat: number, lng: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 }

      const canvas = canvasRef.current
      const tileSize = 256
      const scale = Math.pow(2, viewport.zoom)

      // Web Mercator projection
      const worldX = ((lng + 180) / 360) * tileSize * scale
      const worldY =
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
        tileSize *
        scale

      // Convert to canvas coordinates
      const centerWorldX = ((viewport.centerLng + 180) / 360) * tileSize * scale
      const centerWorldY =
        ((1 -
          Math.log(
            Math.tan((viewport.centerLat * Math.PI) / 180) + 1 / Math.cos((viewport.centerLat * Math.PI) / 180),
          ) /
            Math.PI) /
          2) *
        tileSize *
        scale

      const x = worldX - centerWorldX + canvas.width / 2
      const y = worldY - centerWorldY + canvas.height / 2

      return { x, y }
    },
    [viewport],
  )

  // Convert pixel coordinates to lat/lng
  const pixelToLatLng = useCallback(
    (x: number, y: number) => {
      if (!canvasRef.current) return { lat: 0, lng: 0 }

      const canvas = canvasRef.current
      const tileSize = 256
      const scale = Math.pow(2, viewport.zoom)

      // Convert canvas coordinates to world coordinates
      const centerWorldX = ((viewport.centerLng + 180) / 360) * tileSize * scale
      const centerWorldY =
        ((1 -
          Math.log(
            Math.tan((viewport.centerLat * Math.PI) / 180) + 1 / Math.cos((viewport.centerLat * Math.PI) / 180),
          ) /
            Math.PI) /
          2) *
        tileSize *
        scale

      const worldX = x - canvas.width / 2 + centerWorldX
      const worldY = y - canvas.height / 2 + centerWorldY

      // Convert world coordinates to lat/lng
      const lng = (worldX / (tileSize * scale)) * 360 - 180
      const n = Math.PI - (2 * Math.PI * worldY) / (tileSize * scale)
      const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))

      return { lat, lng }
    },
    [viewport],
  )

  // Load a map tile with better error handling
  const loadTile = useCallback((z: number, x: number, y: number): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const key = `${z}/${x}/${y}`

      if (tileCache.current.has(key)) {
        resolve(tileCache.current.get(key)!)
        return
      }

      const img = new Image()
      img.crossOrigin = "anonymous"

      let timeoutId: NodeJS.Timeout

      img.onload = () => {
        clearTimeout(timeoutId)
        tileCache.current.set(key, img)
        setTilesLoaded((prev) => prev + 1)
        resolve(img)
      }

      img.onerror = () => {
        clearTimeout(timeoutId)
        reject(new Error(`Failed to load tile ${key}`))
      }

      // Add timeout to prevent hanging requests
      timeoutId = setTimeout(() => {
        reject(new Error(`Timeout loading tile ${key}`))
      }, 10000)

      // Use OpenStreetMap tiles with better error handling
      img.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
    })
  }, [])

  // Draw the map
  const drawMap = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas with a neutral background
    ctx.fillStyle = "#f0f9ff" // Light blue background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const tileSize = 256
    const z = Math.max(1, Math.min(18, Math.floor(viewport.zoom))) // Clamp zoom level
    const scale = Math.pow(2, z)

    // Calculate which tiles we need with better bounds checking
    const centerTileX = Math.floor(((viewport.centerLng + 180) / 360) * scale)
    const centerTileY = Math.floor(
      ((1 -
        Math.log(Math.tan((viewport.centerLat * Math.PI) / 180) + 1 / Math.cos((viewport.centerLat * Math.PI) / 180)) /
          Math.PI) /
        2) *
        scale,
    )

    // Calculate how many tiles we need to cover the canvas
    const tilesX = Math.ceil(canvas.width / tileSize) + 2
    const tilesY = Math.ceil(canvas.height / tileSize) + 2

    const startTileX = centerTileX - Math.floor(tilesX / 2)
    const startTileY = centerTileY - Math.floor(tilesY / 2)

    // Load and draw tiles with better error handling
    const tilePromises: Promise<void>[] = []

    for (let tx = 0; tx < tilesX; tx++) {
      for (let ty = 0; ty < tilesY; ty++) {
        const tileX = startTileX + tx
        const tileY = startTileY + ty

        // Skip invalid tiles with proper bounds
        if (tileX < 0 || tileY < 0 || tileX >= scale || tileY >= scale) {
          continue
        }

        const promise = loadTile(z, tileX, tileY)
          .then((img) => {
            // Calculate tile position on canvas - fix the coordinate calculation
            const tileWorldX = (tileX / scale) * 360 - 180
            const tileWorldY = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / scale)))

            const pixelPos = latLngToPixel(tileWorldY, tileWorldX)

            // Only draw if tile is visible on canvas
            if (
              pixelPos.x > -tileSize &&
              pixelPos.x < canvas.width + tileSize &&
              pixelPos.y > -tileSize &&
              pixelPos.y < canvas.height + tileSize
            ) {
              ctx.drawImage(img, Math.floor(pixelPos.x), Math.floor(pixelPos.y), tileSize, tileSize)
            }
          })
          .catch(() => {
            // Draw a subtle placeholder for failed tiles
            const tileWorldX = (tileX / scale) * 360 - 180
            const tileWorldY = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / scale)))

            const pixelPos = latLngToPixel(tileWorldY, tileWorldX)

            // Only draw placeholder if visible
            if (
              pixelPos.x > -tileSize &&
              pixelPos.x < canvas.width + tileSize &&
              pixelPos.y > -tileSize &&
              pixelPos.y < canvas.height + tileSize
            ) {
              ctx.fillStyle = "#e2e8f0" // Light gray
              ctx.fillRect(Math.floor(pixelPos.x), Math.floor(pixelPos.y), tileSize, tileSize)
            }
          })

        tilePromises.push(promise)
      }
    }

    // Wait for tiles to load, then draw overlays
    try {
      await Promise.allSettled(tilePromises)
    } catch (e) {
      console.warn("Some tiles failed to load")
    }

    // Draw polygon with better rendering
    if (polygon && polygon.length >= 3) {
      ctx.strokeStyle = "#059669"
      ctx.fillStyle = "rgba(16, 185, 129, 0.2)"
      ctx.lineWidth = 3
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.beginPath()

      const firstPoint = latLngToPixel(polygon[0].lat, polygon[0].lng)
      ctx.moveTo(firstPoint.x, firstPoint.y)

      for (let i = 1; i < polygon.length; i++) {
        const point = latLngToPixel(polygon[i].lat, polygon[i].lng)
        ctx.lineTo(point.x, point.y)
      }

      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }

    // Draw shapes with better rendering
    [...shapes, ...existingPolygons].forEach((shape) => {
      if (shape.path.length < 2) return

      ctx.strokeStyle = shape.strokeColor || "#0ea5e9"
      ctx.lineWidth = 4
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (shape.type === "LineString") {
        ctx.beginPath()
        const firstPoint = latLngToPixel(shape.path[0].lat, shape.path[0].lng)
        ctx.moveTo(firstPoint.x, firstPoint.y)

        for (let i = 1; i < shape.path.length; i++) {
          const point = latLngToPixel(shape.path[i].lat, shape.path[i].lng)
          ctx.lineTo(point.x, point.y)
        }
        ctx.stroke()
      } else if (shape.type === "Polygon") {
        ctx.fillStyle = shape.fillColor || "rgba(14, 165, 233, 0.25)"
        ctx.beginPath()

        const firstPoint = latLngToPixel(shape.path[0].lat, shape.path[0].lng)
        ctx.moveTo(firstPoint.x, firstPoint.y)

        for (let i = 1; i < shape.path.length; i++) {
          const point = latLngToPixel(shape.path[i].lat, shape.path[i].lng)
          ctx.lineTo(point.x, point.y)
        }

        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    })

    // Draw markers and bubbles with improved record type icons
    ;[...markers, ...bubbles].forEach((marker) => {
      const point = latLngToPixel(marker.position.lat, marker.position.lng)
      const x = point.x
      const y = point.y

      // Only draw if marker is visible
      if (x > -50 && x < canvas.width + 50 && y > -50 && y < canvas.height + 50) {
        if ("recordLabel" in marker) {
          // This is a bubble - draw with improved record type styling and leader line
          const radius = (marker.size || 32) / 2

          const offsetX = marker.offsetX || 40
          const offsetY = marker.offsetY || -30
          const bubbleX = x + offsetX
          const bubbleY = y + offsetY

          ctx.strokeStyle = "rgba(0, 0, 0, 0.4)"
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(bubbleX, bubbleY)
          ctx.stroke()
          ctx.setLineDash([]) // Reset line dash

          ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, Math.PI * 2)
          ctx.fill()

          // Draw outer glow/shadow for better visibility at bubble position
          const gradient = ctx.createRadialGradient(bubbleX, bubbleY, 0, bubbleX, bubbleY, radius + 4)
          gradient.addColorStop(0, "rgba(0, 0, 0, 0)")
          gradient.addColorStop(1, "rgba(0, 0, 0, 0.3)")
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(bubbleX, bubbleY, radius + 4, 0, Math.PI * 2)
          ctx.fill()

          // Get colors for this record type
          const colors = getColorsForRecordType(marker.recordLabel)

          // Draw colored background circle at bubble position
          ctx.fillStyle = colors.background
          ctx.strokeStyle = colors.border
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(bubbleX, bubbleY, radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()

          const letter = getLetterForRecordType(marker.recordLabel)

          // Set up text styling for modern look
          ctx.fillStyle = colors.icon
          ctx.font = `bold ${Math.floor(radius * 0.8)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"

          // Draw the letter
          ctx.fillText(letter, bubbleX, bubbleY)
        } else {
          // This is a regular marker - draw as improved pin
          // Drop shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
          ctx.beginPath()
          ctx.arc(x + 2, y - 13, 12, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.moveTo(x + 2, y - 3)
          ctx.lineTo(x - 4, y + 10)
          ctx.lineTo(x + 8, y + 10)
          ctx.closePath()
          ctx.fill()

          // Main pin
          ctx.fillStyle = "#dc2626"
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(x, y - 15, 12, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()

          // Pin point
          ctx.beginPath()
          ctx.moveTo(x, y - 3)
          ctx.lineTo(x - 6, y + 10)
          ctx.lineTo(x + 6, y + 10)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Inner dot
          ctx.fillStyle = "#ffffff"
          ctx.beginPath()
          ctx.arc(x, y - 15, 4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    })

    // Draw drawing path preview with better rendering
    if (isDrawing && drawingPath.length > 0) {
      ctx.strokeStyle = georefColor || "#2563eb"
      ctx.lineWidth = 3
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.setLineDash([8, 4])

      ctx.beginPath()
      const firstPoint = latLngToPixel(drawingPath[0].lat, drawingPath[0].lng)
      ctx.moveTo(firstPoint.x, firstPoint.y)

      for (let i = 1; i < drawingPath.length; i++) {
        const point = latLngToPixel(drawingPath[i].lat, drawingPath[i].lng)
        ctx.lineTo(point.x, point.y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw coordinate info with better styling
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
    ctx.fillRect(10, 10, 200, 60)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)"
    ctx.lineWidth = 1
    ctx.strokeRect(10, 10, 200, 60)

    ctx.fillStyle = "#374151"
    ctx.font = "12px ui-monospace, monospace"
    ctx.fillText(`Lat: ${viewport.centerLat.toFixed(6)}`, 15, 28)
    ctx.fillText(`Lng: ${viewport.centerLng.toFixed(6)}`, 15, 45)
    ctx.fillText(`Zoom: ${viewport.zoom.toFixed(2)}`, 15, 62)
  }, [viewport, polygon, shapes, existingPolygons, markers, bubbles, isDrawing, drawingPath, georefColor, latLngToPixel, loadTile]);

  // Handle canvas interactions
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      if (e.button === 0) {
        // Left click
        if (pickPointActive || georefMode === "point") {
          const latlng = pixelToLatLng(x, y)
          onPickPoint?.(latlng)
          onGeorefComplete?.({ type: "Point", point: latlng })
          return
        }

        if (mode === "draw" && !polygon && georefMode === "none" && polygonDrawMode) {
          const latlng = pixelToLatLng(x, y)

          if (!isDrawing) {
            setIsDrawing(true)
            setDrawingPath([latlng])
          } else {
            const newPath = [...drawingPath, latlng]
            setDrawingPath(newPath)

            // Check if we're closing the polygon
            if (newPath.length >= 3) {
              const first = newPath[0]
              const firstPixel = latLngToPixel(first.lat, first.lng)
              const distance = Math.sqrt(Math.pow(x - firstPixel.x, 2) + Math.pow(y - firstPixel.y, 2))

              if (distance < 20) {
                // 20 pixel tolerance
                const area = calculatePolygonArea(newPath)
                if (area > maxAreaSqMeters) {
                  toast({
                    title: "Area limit exceeded",
                    description: `Max polygon area is ${(maxAreaSqMeters / 1_000_000).toFixed(3)} km². Please draw a smaller area.`,
                    variant: "destructive",
                  })
                } else {
                  onPolygonChange?.(newPath, area)
                }
                setIsDrawing(false)
                setDrawingPath([])
                setPolygonDrawMode(false) // Exit draw mode after completing polygon
              }
            }
          }
          return
        }

        if (georefMode === "line" || georefMode === "polygon") {
          const latlng = pixelToLatLng(x, y)

          if (!isDrawing) {
            setIsDrawing(true)
            setDrawingPath([latlng])
          } else {
            const newPath = [...drawingPath, latlng]
            setDrawingPath(newPath)

            if (georefMode === "polygon" && newPath.length >= 3) {
              const first = newPath[0]
              const firstPixel = latLngToPixel(first.lat, first.lng)
              const distance = Math.sqrt(Math.pow(x - firstPixel.x, 2) + Math.pow(y - firstPixel.y, 2))

              if (distance < 20) {
                // 20 pixel tolerance - close the polygon
                onGeorefComplete?.({ type: "Polygon", path: newPath })
                setIsDrawing(false)
                setDrawingPath([])
              }
            }
          }
          return
        }

        // Start panning
        setIsPanning(true)
        setLastPanPoint({ x, y })
      }
    },
    [
      mode,
      polygon,
      georefMode,
      pickPointActive,
      isDrawing,
      drawingPath,
      maxAreaSqMeters,
      onPickPoint,
      onGeorefComplete,
      onPolygonChange,
      pixelToLatLng,
      latLngToPixel,
      toast,
      polygonDrawMode,
    ],
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPanning || !lastPanPoint) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const deltaX = x - lastPanPoint.x
      const deltaY = y - lastPanPoint.y

      // Convert pixel delta to lat/lng delta - FIX THE DIRECTION
      const scale = Math.pow(2, viewport.zoom)
      const tileSize = 256

      // Fixed panning direction - negative deltaX for lng, positive deltaY for lat
      const lngDelta = -(deltaX / (tileSize * scale)) * 360
      const latDelta = (deltaY / (tileSize * scale)) * 180

      setViewport((prev) => ({
        ...prev,
        centerLat: prev.centerLat + latDelta,
        centerLng: prev.centerLng + lngDelta,
      }))

      setLastPanPoint({ x, y })
    },
    [isPanning, lastPanPoint, viewport.zoom],
  )

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false)
    setLastPanPoint(null)
  }, [])

  const handleCanvasDoubleClick = useCallback(() => {
    if (georefMode === "line" && isDrawing && drawingPath.length >= 2) {
      onGeorefComplete?.({ type: "LineString", path: drawingPath })
      setIsDrawing(false)
      setDrawingPath([])
    }
    if (georefMode === "polygon" && isDrawing && drawingPath.length >= 3) {
      onGeorefComplete?.({ type: "Polygon", path: drawingPath })
      setIsDrawing(false)
      setDrawingPath([])
    }
  }, [georefMode, isDrawing, drawingPath, onGeorefComplete])

  // Handle file drops
  useEffect(() => {
    if (!enableDrop || !containerRef.current) return

    const container = containerRef.current

    const handleDragEnter = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return
      dragDepthRef.current += 1
      setIsDragging(true)
    }

    const handleDragOver = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return
      e.preventDefault()
    }

    const handleDragLeave = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) setIsDragging(false)
    }

    const handleDrop = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return
      e.preventDefault()
      dragDepthRef.current = 0
      setIsDragging(false)

      const files = extractFiles(e.dataTransfer)
      if (!files.length || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const latlng = pixelToLatLng(x, y)

      onDropFilesAt?.(latlng, files)
    }

    container.addEventListener("dragenter", handleDragEnter)
    container.addEventListener("dragover", handleDragOver)
    container.addEventListener("dragleave", handleDragLeave)
    container.addEventListener("drop", handleDrop)

    return () => {
      container.removeEventListener("dragenter", handleDragEnter)
      container.removeEventListener("dragover", handleDragOver)
      container.removeEventListener("dragleave", handleDragLeave)
      container.removeEventListener("drop", handleDrop)
    }
  }, [enableDrop, onDropFilesAt, pixelToLatLng])

  // Resize canvas and redraw
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      drawMap()
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [drawMap])

  // Redraw when viewport changes
  useEffect(() => {
    drawMap()
  }, [drawMap])

  // Focus on point
  useEffect(() => {
    if (focusPoint) {
      setViewport((prev) => ({
        ...prev,
        centerLat: focusPoint.lat,
        centerLng: focusPoint.lng,
        zoom: focusZoom || prev.zoom,
      }))
    }
  }, [focusPoint, focusZoom])

  useEffect(() => {
    setViewport((prev) => ({
      ...prev,
      centerLat: center.lat,
      centerLng: center.lng,
      zoom: zoom,
    }))
  }, [center.lat, center.lng, zoom])

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className={`w-full h-full relative z-0 ${
          pickPointActive || georefMode === "point"
            ? "cursor-crosshair"
            : polygonDrawMode && mode === "draw" && !polygon && georefMode === "none"
              ? "cursor-crosshair"
              : isPanning
                ? "cursor-grabbing"
                : "cursor-grab"
        }`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
      />

      {/* Drag overlay */}
      {isDragging && enableDrop && (
        <div className="absolute inset-0 z-[1000] pointer-events-none">
          <div className="absolute inset-0 border-2 border-dashed border-emerald-500 bg-emerald-50/40 rounded-md" />
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md px-3 py-1 text-xs font-medium text-white bg-emerald-600 shadow-sm">
            Drop files to georeference at cursor
          </div>
        </div>
      )}

      {/* Georeferencing instructions */}
      {georefMode !== "none" && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md px-3 py-1 text-xs font-medium text-white bg-green-600 shadow-sm z-[1000]">
          {georefMode === "point"
            ? "Click to place point"
            : georefMode === "line"
              ? "Click to draw a line, double-click to finish"
              : "Click to draw a polygon, click near first point or double-click to finish"}
        </div>
      )}

      {/* Drawing instructions */}
      {polygonDrawMode && !isDrawing && (
        <div className="absolute left-1/2 bottom-3 -translate-x-1/2 rounded-md px-3 py-1 text-xs font-medium text-white bg-blue-600 shadow-sm z-[1000]">
          Click on the map to start drawing a polygon
        </div>
      )}
      {isDrawing && (
        <div className="absolute left-1/2 bottom-3 -translate-x-1/2 rounded-md px-3 py-1 text-xs font-medium text-white bg-blue-600 shadow-sm z-[1000]">
          {georefMode === "none" && mode === "draw"
            ? `Drawing polygon: ${drawingPath.length} points. Click near first point to close.`
            : georefMode === "line"
              ? `Drawing line: ${drawingPath.length} points. Double-click to finish.`
              : georefMode === "polygon"
                ? `Drawing polygon: ${drawingPath.length} points. Click near first point or double-click to finish.`
                : `Drawing: ${drawingPath.length} points`}
        </div>
      )}

      {/* Map controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000]">
        {mode === "draw" && !polygon && georefMode === "none" && (
          <button
            onClick={() => {
              setPolygonDrawMode(!polygonDrawMode)
              if (polygonDrawMode) {
                // Cancel any current drawing
                setIsDrawing(false)
                setDrawingPath([])
              }
            }}
            className={`px-3 py-2 text-sm font-medium shadow-sm border rounded ${
              polygonDrawMode ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white hover:bg-gray-50"
            }`}
          >
            {polygonDrawMode ? "Cancel Draw" : "Draw Polygon"}
          </button>
        )}
        <button
          onClick={() => setViewport((prev) => ({ ...prev, zoom: Math.min(18, prev.zoom + 1) }))}
          className="bg-white border rounded px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
        >
          +
        </button>
        <button
          onClick={() => setViewport((prev) => ({ ...prev, zoom: Math.max(1, prev.zoom - 1) }))}
          className="bg-white border rounded px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
        >
          −
        </button>
      </div>

      {/* Info popup */}
      {openInfo && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border p-3 max-w-xs z-[1000]">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="font-medium text-sm">{openInfo.title}</div>
              {openInfo.description && (
                <div className="text-xs text-muted-foreground whitespace-pre-line">{openInfo.description}</div>
              )}
            </div>
            <button onClick={() => setOpenInfo(null)} className="text-muted-foreground hover:text-foreground">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Map attribution */}
      <div className="absolute bottom-3 right-3 bg-white/90 rounded px-2 py-1 text-xs text-muted-foreground z-[1000]">
        © OpenStreetMap contributors
      </div>

      {/* Loading indicator */}
      {tilesLoaded < 4 && (
        <div className="absolute bottom-3 left-3 bg-white/90 rounded px-2 py-1 text-xs text-muted-foreground z-[1000]">
          Loading map tiles...
        </div>
      )}
    </div>
  )
}

function getColorsForRecordType(recordLabel: string): { background: string; border: string; icon: string } {
  // Extract utility type from record label (assuming format like "Water / As Built" or similar)
  const parts = recordLabel.split("/").map((p) => p.trim().toLowerCase())
  let utilityType = "other"

  // Try to identify utility type from the label
  if (parts.some((p) => p.includes("water") && !p.includes("waste"))) {
    utilityType = "water"
  } else if (parts.some((p) => p.includes("wastewater") || p.includes("sanitary"))) {
    utilityType = "wastewater"
  } else if (parts.some((p) => p.includes("storm"))) {
    utilityType = "storm"
  } else if (parts.some((p) => p.includes("gas"))) {
    utilityType = "gas"
  } else if (parts.some((p) => p.includes("telecom") || p.includes("comm"))) {
    utilityType = "telecom"
  } else if (parts.some((p) => p.includes("electric") || p.includes("power"))) {
    utilityType = "electric"
  }

  // Use APWA colors based on utility type
  switch (utilityType) {
    case "water":
      return {
        background: "#dbeafe", // Light blue
        border: "#2563eb", // APWA Blue
        icon: "#1e40af", // Dark blue
      }
    case "wastewater":
    case "storm":
      return {
        background: "#dcfce7", // Light green
        border: "#059669", // APWA Green
        icon: "#047857", // Dark green
      }
    case "gas":
      return {
        background: "#fef3c7", // Light yellow
        border: "#ca8a04", // APWA Yellow
        icon: "#a16207", // Dark yellow
      }
    case "telecom":
      return {
        background: "#fed7aa", // Light orange
        border: "#ea580c", // APWA Orange
        icon: "#c2410c", // Dark orange
      }
    case "electric":
      return {
        background: "#fecaca", // Light red
        border: "#dc2626", // APWA Red
        icon: "#b91c1c", // Dark red
      }
    default:
      return {
        background: "#f1f5f9", // Light slate
        border: "#475569", // Slate
        icon: "#334155", // Dark slate
      }
  }
}

function getLetterForRecordType(recordLabel: string): string {
  const label = recordLabel.toLowerCase()

  if (label.includes("as built") || label.includes("as-built")) {
    return "A"
  } else if (label.includes("permit")) {
    return "P"
  } else if (label.includes("locate")) {
    return "L"
  } else {
    return "O" // Other
  }
}

// Simple polygon area calculation (approximate)
function calculatePolygonArea(path: LatLng[]): number {
  let area = 0
  for (let i = 0; i < path.length; i++) {
    const j = (i + 1) % path.length
    area += path[i].lat * path[j].lng
    area -= path[j].lat * path[i].lng
  }
  area = Math.abs(area) / 2

  // Convert to approximate square meters (very rough)
  return area * 111000 * 111000
}

