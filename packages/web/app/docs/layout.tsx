import Link from "next/link";
import { DocSidebar } from "@/components/docs/DocSidebar";
import { DocBreadcrumb } from "@/components/docs/DocBreadcrumb";

/** Header height for docs layout (matches HeaderBar). */
const HEADER_HEIGHT = "3.5rem";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex justify-center overflow-hidden"
      style={{
        height: `calc(100svh - ${HEADER_HEIGHT})`,
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="w-full max-w-6xl flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">
        <aside
          className="doc-aside w-full md:w-56 shrink-0 border-divider md:border-r px-4 sm:px-5 py-4 md:py-6 overflow-y-auto min-h-0 max-h-[40svh] md:max-h-none"
          style={{ backgroundColor: "var(--background)" }}
        >
          <Link
            href="/"
            className="text-xs font-medium block mb-4 md:mb-5"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            ← Homepage
          </Link>
          <Link
            href="/docs"
            className="text-xs font-medium block mb-4"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            AEP Documentation
          </Link>
          <DocSidebar />
        </aside>
        <main
          className="flex-1 min-w-0 min-h-0 overflow-y-auto overscroll-y-contain px-4 sm:px-5 md:px-8 lg:px-10 pt-4 sm:pt-5 pb-6 sm:pb-8"
          style={{
            WebkitOverflowScrolling: "touch",
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          } as React.CSSProperties}
        >
          <div className="w-full max-w-4xl">
            <DocBreadcrumb />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
