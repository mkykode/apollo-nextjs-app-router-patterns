import { type ReactNode, ViewTransition } from "react";
import { NAV_BACK, NAV_FORWARD } from "@/lib/navigation-types";

/** Transition type to view transition class; anything untyped (browser back, refresh) does nothing. */
const BY_TYPE = { [NAV_FORWARD]: "nav-forward", [NAV_BACK]: "nav-back", default: "none" };

/**
 * Directional page animation. The old page slides out and the new one slides in, left for
 * forward and right for back, with the CSS in globals.css. Two placement rules from React:
 * wrap the page's root, not the layout (layouts persist across navigations, so enter and exit
 * never fire there), and put nothing between the <ViewTransition> and the top of the page,
 * because enter and exit only activate when no DOM node sits above the boundary.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={BY_TYPE} exit={BY_TYPE} default="none">
      {children}
    </ViewTransition>
  );
}
