import { DocAsideShell } from "@/components/docs/DocAsideShell";
import { DocBreadcrumb } from "@/components/docs/DocBreadcrumb";
import { DocsChatWidget } from "@/components/DocsChatWidget";

/** Header height for docs layout (matches HeaderBar). */
const HEADER_HEIGHT = "3.5rem";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="flex justify-center overflow-hidden"
        style={{
          height: `calc(100svh - ${HEADER_HEIGHT})`,
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        <div className="w-full max-w-6xl flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">
          <DocAsideShell />
          <main
            className="flex-1 min-w-0 min-h-0 overflow-y-auto overscroll-y-contain px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 md:py-6"
            style={{
              WebkitOverflowScrolling: "touch",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              paddingBottom: "calc(var(--space-6) + env(safe-area-inset-bottom))",
            } as React.CSSProperties}
          >
            <div className="w-full max-w-4xl">
              <DocBreadcrumb />
              {children}
            </div>
          </main>
        </div>
      </div>
      <DocsChatWidget />
    </>
  );
}
