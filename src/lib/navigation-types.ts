/**
 * Transition types tag a navigation with its meaning, so a <ViewTransition> can pick the
 * animation: forward slides the new page in from the right, back from the left. Next.js passes
 * them to React's addTransitionType; `<Link transitionTypes>` and `router.push(href,
 * { transitionTypes })` are the two ways to attach them. Browser back and forward carry none.
 */
export const NAV_FORWARD = "nav-forward";
export const NAV_BACK = "nav-back";
