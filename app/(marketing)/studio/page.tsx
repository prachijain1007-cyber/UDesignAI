import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomDesignStudio } from "@/components/studio/room-design-studio";

export const metadata: Metadata = {
  title: "AI Design Studio",
  description: "Upload a photo of your room and generate a stunning AI interior design concept in seconds.",
};

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <RoomDesignStudio />
    </Suspense>
  );
}
