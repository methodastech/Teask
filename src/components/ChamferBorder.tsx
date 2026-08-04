/**
 * Historically this module cut a 45° chamfer off the bottom-right corner of
 * buttons and cards. The design has since moved to clean rectangles, so:
 *
 *  · `chamferClip` returns 'none', every `style={{ clipPath: chamferClip(n) }}`
 *    call site keeps compiling and now renders an uncut rectangle
 *  · `ChamferBorder` draws a plain 1px outline instead of the chamfered trace
 *
 * Both keep their signatures so no consumer needs touching; the `cut` and
 * `width` props are accepted and `cut` is simply ignored.
 */

export const chamferClip = (_cut: number) => 'none'

export default function ChamferBorder({
  cut: _cut = 36,
  width = 1,
  className = '',
}: {
  cut?: number
  width?: number
  className?: string
}) {
  return (
    <span
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ border: `${width}px solid currentColor` }}
      aria-hidden="true"
    />
  )
}
