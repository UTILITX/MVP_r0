"use client";

import { MapContainer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "esri-leaflet";
import "esri-leaflet-vector";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { useEffect, useMemo } from "react";

// 🔧 Optional: patch Leaflet icon URLs for markers
function patchLeafletIcons() {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}
patchLeafletIcons();

// ✅ Esri basemap + Geoman drawing logic
function SetupMap() {
  const map = useMap();

  useEffect(() => {
    // Esri vector basemap
    const layer = L.esri.Vector.vectorBasemapLayer("ArcGIS:Streets", {
      apiKey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY,
    });
    layer.addTo(map);

    // Geoman drawing controls
    map.pm.addControls({
      position: "topleft",
      drawMarker: true,
      drawPolyline: true,
      drawPolygon: true,
      editMode: true,
      removalMode: true,
    });

    // Event: handle geometry creation
    map.on("pm:create", (e: any) => {
      const geojson = e.layer.toGeoJSON();
      console.log("✅ New geometry drawn:", geojson);
    });

    return () => {
      map.removeLayer(layer);
    };
  }, [map]);

  return null;
}

export default function MapWithDrawing() {
  const center = useMemo(() => [43.7, -79.4], []);
  const zoom = 13;

  return (
    <div className="h-[600px] w-full rounded-lg border overflow-hidden">
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <SetupMap />
      </MapContainer>
    </div>
  );
}
