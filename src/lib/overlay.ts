/**
 * "Something opaque is covering the viewport."
 *
 * The hero's opening descent paints over the whole screen for seven seconds
 * while it is also the heaviest thing on the page. Anything else animating
 * underneath it is spending frames on pixels nobody can see, and spending them
 * out of the same budget the descent is short of.
 *
 * A window event rather than context or a store: the parties are a component in
 * the page chrome and a component three routes down, they have no relationship
 * beyond this one fact, and neither should have to re-render because of it —
 * both act on it by starting or stopping a rAF loop, outside React entirely.
 */
export const OVERLAY_EVENT = 'teask:viewport-covered'

export function setViewportCovered(covered: boolean) {
  window.dispatchEvent(new CustomEvent(OVERLAY_EVENT, { detail: covered }))
}
