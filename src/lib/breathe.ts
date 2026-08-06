/**
 * Hand the main thread back, so something else can draw a frame.
 *
 * The hero builds itself while the intro descent is playing over the top of it,
 * and both want the same thread. The descent is driven off the wall clock — its
 * camera position is a function of `performance.now()`, not of how many frames
 * have gone by — so a long synchronous task does not slow it down, it makes it
 * SKIP. Half a second of blocking work is not a stutter, it is the camera
 * teleporting a hundred metres down the sky and carrying on.
 *
 * The build is not one long task by nature, only by construction: it is a
 * sequence of independent stages. Awaiting this between them turns one 500ms
 * block into a dozen short ones with paint opportunities in the gaps.
 *
 * rAF and then a timeout, rather than either alone:
 *
 *  · `requestAnimationFrame` puts us in the same batch as the animation that
 *    wants the frame — but callbacks in that batch run BEFORE paint, so
 *    resuming inside it would just hand the work back before anything reached
 *    the screen.
 *  · the nested `setTimeout(0)` resumes us in a fresh macrotask, which the
 *    browser runs after it has finished compositing that frame.
 *
 * So the animation renders, the frame paints, and only then does the next stage
 * of the build begin.
 */
export function breathe(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, 0))
    } else {
      setTimeout(resolve, 0)
    }
  })
}
