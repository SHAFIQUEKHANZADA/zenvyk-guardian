import type { Metadata } from "next";
import { Suspense } from "react";
import { ResourceIntelligence } from "@/components/resource/resource-intelligence";

export const metadata: Metadata = {
  title: "Resource Intelligence · Zenvyk Guardian",
};

export default function ResourcePage() {
  return (
    <Suspense fallback={null}>
      <ResourceIntelligence />
    </Suspense>
  );
}
