import type { Metadata } from "next";
import { ApiKeys } from "@/components/api-keys/api-keys";

export const metadata: Metadata = { title: "API Keys · Zenvyk Guardian" };

export default function ApiKeysPage() {
  return <ApiKeys />;
}
