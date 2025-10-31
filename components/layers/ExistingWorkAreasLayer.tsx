'use client'

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

type WorkArea = {
  id: string;
  name: string;
  geojson: GeoJSON.GeoJsonObject;
  created_at: string;
};

export default function ExistingWorkAreasLayer({
  onSelect,
}: {
  onSelect?: (wa: WorkArea) => void;
}) {
  const map = useMap();

  useEffect(() => {
    let layerGroup = L.layerGroup(); // Manage layers as a group

    const fetchAndRender = async () => {
      try {
        const res = await fetch("/api/work-areas");
        const { work_areas } = await res.json();

        work_areas.forEach((wa: WorkArea) => {
          const geoJsonLayer = L.geoJSON(wa.geojson, {
            onEachFeature: (_, layer) => {
              layer.on("click", () => onSelect?.(wa));
            },
            style: {
              color: "#007bff",
              weight: 2,
              fillOpacity: 0.2,
            },
          });

          layerGroup.addLayer(geoJsonLayer);
        });

        layerGroup.addTo(map);
      } catch (err) {
        console.error("❌ Failed to fetch work areas:", err);
      }
    };

    fetchAndRender();

    return () => {
      layerGroup.clearLayers(); // ✅ Cleanup to avoid duplicates
      map.removeLayer(layerGroup);
    };
  }, [map, onSelect]);

  return null;
}
