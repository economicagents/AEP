"use client";

export interface AccordionItem {
  id?: string;
  title: React.ReactNode;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

function ChevronIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      aria-hidden
      className="accordion-chevron shrink-0 w-4 h-4 transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]"
      style={{ color: "var(--foreground)", opacity: 0.5 }}
    >
      <polygon points="0,64 128,192 256,64" fill="currentColor" />
    </svg>
  );
}

export function Accordion({ items, className = "" }: AccordionProps) {
  return (
    <div className={`accordion divide-y divide-[rgba(37,39,59,0.1)] [data-theme="dark"]:divide-[rgba(255,255,255,0.1)] ${className}`}>
      {items.map((item) => (
        <details
          key={item.id ?? (typeof item.title === "string" ? item.title : `accordion-${String(item.content).slice(0, 40)}`)}
          className="accordion-item py-4 first:pt-0 last:pb-0 sm:py-4"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left min-h-[44px] py-2 sm:py-0 touch-manipulation [-webkit-tap-highlight-color:transparent]">
            <span
              className="font-semibold text-sm leading-relaxed flex-1 min-w-0"
              style={{ color: "var(--foreground)" }}
            >
              {item.title}
            </span>
            <ChevronIcon />
          </summary>
          <div
            className="mt-3 pl-0 text-sm leading-relaxed"
            style={{ color: "var(--foreground)", opacity: 0.65 }}
          >
            {item.content}
          </div>
        </details>
      ))}
    </div>
  );
}
