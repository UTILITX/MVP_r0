"use client";

import { MapContainer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "esri-leaflet"; // ✅ must come before vector
import "esri-leaflet-vector";

// Patch broken Leaflet icon paths
function patchLeafletIcons() {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}
patchLeafletIcons();

export default function MapWithDrawing() {
  const center = useMemo(() => ({ lat: 43.65, lng: -79.38 }), []);
  const zoom = 12;

  const onMapReady = (map: L.Map) => {
    // ✅ Safely load Esri vector basemap
    if ((L as any).esri?.Vector) {
      const basemap = (L as any).esri.Vector.basemap("ArcGIS:LightGray", {
        apiKey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY,
      });
      basemap.addTo(map);
    } else {
      console.error("❌ Esri vector basemap not available. Check your 'esri-leaflet' imports.");
    }

    // Add drawing controls
    (map as any).pm.addControls({
      position: "topleft",
      drawMarker: true,
      drawPolyline: true,
      drawPolygon: true,
      editMode: true,
      removalMode: true,
    });

    map.on("pm:create", (e: any) => {
      const layer = e.layer;
      const geojson = layer.toGeoJSON();
      console.log("✅ Created geometry:", geojson);
    });
  };

  return (
    <div className="w-full h-[80vh] rounded-lg overflow-hidden border">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "100%" }}
        whenReady={({ target }) => onMapReady(target)}
      >
        {/* Leaflet requires at least one child, even an empty fragment */}
        <></>
      </MapContainer>
    </div>
  );
}
