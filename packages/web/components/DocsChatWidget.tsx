"use client";

import dynamic from "next/dynamic";

/**
 * Code-split the docs assistant (react-markdown + remark-gfm) so the layout stays lean.
 * `ssr: false` is only valid in a Client Component (not in RSC).
 */
export const DocsChatWidget = dynamic(() => import("./DocsChatWidgetClient"), {
  ssr: false,
  loading: () => null,
});
