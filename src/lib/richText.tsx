import { Fragment, type ReactNode } from 'react'

/**
 * Inline formatting inside a paragraph, written as markers in plain text:
 *
 *     **bold**            _italic_            [label](https://url)
 *
 * Deliberately not HTML. The studio's editor is a contentEditable, and letting
 * it store markup would mean whatever the browser produced — or whatever
 * someone pasted out of Word — being injected into the published page. This
 * stores text and turns the markers into elements at render time, so the worst
 * a paragraph can contain is text.
 *
 * Anything that is not a complete, matched marker is left exactly as typed:
 * articles about pricing and specs use asterisks for other reasons.
 */

/** A fresh regex each time — a shared /g one carries lastIndex between calls. */
const token = () => /\*\*(.+?)\*\*|_([^_\n]+)_|\[([^\]\n]+)\]\(([^)\s]+)\)/g

/**
 * Where a link may point. Anything with a scheme we did not ask for —
 * `javascript:` above all — is refused, and the label renders as plain text
 * rather than as something clickable that runs code.
 */
function safeHref(raw: string): string | null {
  const url = raw.trim()
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url)) return url
  // a scheme we do not recognise
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null
  // no scheme at all: an address typed as teask.asia/x
  return `https://${url}`
}

export function RichText({ text }: { text: string }): ReactNode {
  if (!/[*_[]/.test(text)) return text

  const parts: ReactNode[] = []
  let cursor = 0
  let matched = false

  for (const match of text.matchAll(token())) {
    matched = true
    const [whole, bold, italic, label, href] = match
    const at = match.index ?? 0
    if (at > cursor) parts.push(text.slice(cursor, at))

    // recurse into what was matched, so **bold with _italic_ inside** renders
    // as both rather than showing the inner markers as literal characters.
    // It terminates: each captured string is strictly shorter than its parent.
    if (bold !== undefined) {
      parts.push(
        <strong>
          <RichText text={bold} />
        </strong>,
      )
    } else if (italic !== undefined) {
      parts.push(
        <em>
          <RichText text={italic} />
        </em>,
      )
    } else {
      const to = safeHref(href)
      const external = to !== null && /^https?:\/\//i.test(to)
      parts.push(
        to === null ? (
          whole
        ) : (
          <a
            href={to}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="text-teal-brand underline underline-offset-2 transition-colors hover:text-blue-brand"
          >
            {label}
          </a>
        ),
      )
    }
    cursor = at + whole.length
  }

  // a stray asterisk or an unclosed marker is just text, and should come back
  // as text rather than as a one-element tree
  if (!matched) return text

  if (cursor < text.length) parts.push(text.slice(cursor))

  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>)
}

/** the same text with its markers removed, for word counts and meta tags */
export const plainText = (text: string) =>
  text.replace(token(), (whole, bold, italic, label) => bold ?? italic ?? label ?? whole)

/**
 * Applying formatting to a stretch of text.
 *
 * Kept here, apart from the editor, because it is pure arithmetic on offsets
 * and getting it wrong by one character is what scrambles a paragraph. The
 * returned `select` is where the same words end up once the markers are in, so
 * the editor can leave them selected.
 */
export interface Edited {
  text: string
  select: [number, number]
}

/** wrap start..end in a marker, or unwrap it if the marker is already there */
export function toggleMarker(text: string, start: number, end: number, marker: string): Edited {
  const selected = text.slice(start, end)
  const n = marker.length
  const wrapped = text.slice(start - n, start) === marker && text.slice(end, end + n) === marker

  return wrapped
    ? {
        text: text.slice(0, start - n) + selected + text.slice(end + n),
        select: [start - n, end - n],
      }
    : {
        text: text.slice(0, start) + marker + selected + marker + text.slice(end),
        select: [start + n, end + n],
      }
}

/** turn start..end into a link, leaving the label selected rather than the URL */
export function insertLink(text: string, start: number, end: number, url: string): Edited {
  const label = text.slice(start, end)
  return {
    text: `${text.slice(0, start)}[${label}](${url})${text.slice(end)}`,
    select: [start + 1, start + 1 + label.length],
  }
}
