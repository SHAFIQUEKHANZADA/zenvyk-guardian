import type { Metadata } from "next";
import { ConversationRouter } from "@/components/router/conversation-router";

export const metadata: Metadata = { title: "Router · Zenvyk Guardian" };

export default function RouterPage() {
  return <ConversationRouter />;
}
