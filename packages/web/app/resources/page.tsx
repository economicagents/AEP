import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Resources — AEP",
  description: "AEP resources and references.",
};

export default function ResourcesPage() {
  redirect("/docs");
}
