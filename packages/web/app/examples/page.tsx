import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Examples — AEP",
  description: "AEP usage examples and guides.",
};

export default function ExamplesPage() {
  redirect("/docs");
}
