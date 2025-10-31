"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type WorkArea = {
  id: string;
  name: string;
  created_at: string;
  polygon: { lat: number; lng: number }[];
};

export default function MapWithWorkAreas() {
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkAreas() {
      const res = await fetch("/api/work-areas/all");
      const json = await res.json();
      if (json.ok) {
        setWorkAreas(json.workAreas);
      }
    }

    fetchWorkAreas();
  }, []);

  return (
    <div className="h-[600px] w-full">
      <MapContainer
        center={[43.6532, -79.3832]} // Toronto default
        zoom={14}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {workAreas.map((wa) => (
          <Polygon
            key={wa.id}
            positions={wa.polygon.map((p) => [p.lat, p.lng])}
            pathOptions={{
              color: wa.id === selectedId ? "orange" : "blue",
              weight: 2,
              fillOpacity: 0.3,
            }}
            eventHandlers={{
              click: () => {
                setSelectedId(wa.id);
                console.log("🟠 Clicked:", wa.name);
              },
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
