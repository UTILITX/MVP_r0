import dynamic from "next/dynamic";

const MapWithDrawing = dynamic(() => import("@/components/map-with-drawing"), { ssr: false });

export default function UploadTab() {
  return (
    <div>
      <MapWithDrawing />
    </div>
  );
}
