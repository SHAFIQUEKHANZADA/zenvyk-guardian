import { Boxes } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function ModelsPage() {
  return (
    <ComingSoon
      title="Models"
      icon={Boxes}
      description="Configure the model panel and weights used for consensus verification."
    />
  );
}
