import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Resource — AEP",
  description: "AEP resource detail.",
};

export default function ResourceDetailPage() {
  redirect("/docs");
}
