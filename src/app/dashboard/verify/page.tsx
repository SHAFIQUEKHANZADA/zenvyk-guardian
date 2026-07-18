import type { Metadata } from "next";
import { Suspense } from "react";
import { BusinessVerification } from "@/components/kyb/business-verification";

export const metadata: Metadata = {
  title: "Business Verification · Zenvyk Guardian",
};

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <BusinessVerification />
    </Suspense>
  );
}
