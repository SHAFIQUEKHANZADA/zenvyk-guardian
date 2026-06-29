import { Database } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function DatasetsPage() {
  return (
    <ComingSoon
      title="Datasets"
      icon={Database}
      description="Upload and manage evaluation datasets to benchmark verification quality."
    />
  );
}
