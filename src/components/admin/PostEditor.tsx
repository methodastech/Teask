import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { PostKind } from '../../lib/posts'
import { ImagePlus, Monitor, Plus, Smartphone, Trash2, X } from 'lucide-react'

/**
 * A write-in-place editor rather than a form.
 *
 * The canvas renders the article roughly as it will appear on the site, and you
 * type directly into it: the headline is the headline, paragraphs are blocks
 * you can add between and delete. Labelled input fields make you imagine the
 * result; this shows it.
 *
 * contentEditable and React fight over the DOM, so every editable node is
 * deliberately *uncontrolled*: its text is written once on mount and after that
 * React never touches it. Feeding state back in on each keystroke is what makes
 * naive implementations jump the caret to the start of the line.
 */
function Editable({
  initial,
  onChange,
  onEnter,
  placeholder,
  className,
  tag: Tag = 'div',
}: {
  initial: string
  onChange: (v: string) => void
  onEnter?: () => void
  placeholder: string
  className?: string
  tag?: 'div' | 'h1' | 'p'
}) {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (ref.current && ref.current.innerText !== initial) ref.current.innerText = initial
    // mount only: see the note above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <Tag
      ref={ref as never}
      data-editable
      data-placeholder={placeholder}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      onInput={(e: React.FormEvent<HTMLElement>) => onChange(e.currentTarget.innerText)}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (onEnter && e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          onEnter()
        }
      }}
      className={className}
    />
  )
}

export interface EditorDoc {
  kind: PostKind
  title: string
  category: string
  description: string
  cover: string
  blocks: { id: number; text: string }[]
}

export const emptyDoc = (): EditorDoc => ({
  kind: 'article',
  title: '',
  category: '',
  description: '',
  cover: '',
  blocks: [{ id: 1, text: '' }],
})

export default function PostEditor({
  doc,
  setDoc,
  onPublish,
  onExit,
  readMinutes,
  onPickImage,
}: {
  doc: EditorDoc
  setDoc: (fn: (d: EditorDoc) => EditorDoc) => void
  onPublish: () => void
  onExit: () => void
  readMinutes: number
  onPickImage: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const nextId = useRef(1000)
  const focusBlock = useRef<number | null>(null)

  // focus a freshly inserted block once it exists in the DOM
  useEffect(() => {
    if (focusBlock.current === null) return
    const el = document.querySelector<HTMLElement>(`[data-block-id="${focusBlock.current}"] [data-editable]`)
    el?.focus()
    focusBlock.current = null
  })

  const addBlockAfter = (index: number) => {
    const id = ++nextId.current
    setDoc((d) => {
      const blocks = [...d.blocks]
      blocks.splice(index + 1, 0, { id, text: '' })
      return { ...d, blocks }
    })
    focusBlock.current = id
  }

  const removeBlock = (id: number) =>
    setDoc((d) => ({ ...d, blocks: d.blocks.length > 1 ? d.blocks.filter((b) => b.id !== id) : d.blocks }))

  const canPublish = doc.title.trim() && doc.description.trim() && doc.blocks.some((b) => b.text.trim())

  return (
    <div className="mt-8">
      {/* ── toolbar ─────────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 -mx-5 mb-6 flex flex-wrap items-center gap-3 border-y border-navy-950/10 bg-white/95 px-5 py-3 backdrop-blur-sm sm:-mx-10 sm:px-10 md:top-20">
        <button
          type="button"
          onClick={onExit}
          className="cursor-pointer font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase transition-colors hover:text-navy-950"
        >
          ← Exit
        </button>
        <span className="h-4 w-px bg-navy-950/10" />
        <span className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
          Draft · {readMinutes} min read
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-navy-950/10 bg-paper p-0.5">
            {([['desktop', Monitor], ['mobile', Smartphone]] as const).map(([k, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => setDevice(k)}
                aria-label={`${k} preview`}
                aria-pressed={device === k}
                className={`grid h-7 w-8 cursor-pointer place-items-center rounded-md transition-colors ${
                  device === k ? 'bg-white text-navy-950 shadow-sm' : 'text-gray-400 hover:text-navy-950'
                }`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onPublish}
            disabled={!canPublish}
            className="cursor-pointer bg-blue-brand px-6 py-2.5 text-xs font-semibold tracking-[0.15em] text-white uppercase transition-colors hover:bg-teal-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            Publish
          </button>
        </div>
      </div>

      {/* ── the page ────────────────────────────────────────────── */}
      <div
        className={`mx-auto border border-navy-950/[0.08] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05),0_24px_60px_-24px_rgba(16,24,40,0.18)] transition-[max-width] duration-300 ${
          device === 'mobile' ? 'max-w-[420px]' : 'max-w-[820px]'
        }`}
      >
        {/* cover */}
        <div className="group relative aspect-[16/9] w-full overflow-hidden bg-paper">
          {doc.cover ? (
            <img src={doc.cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-center">
              <span className="font-mono text-[10px] tracking-[0.2em] text-gray-400 uppercase">
                No cover image
              </span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-navy-950/0 opacity-0 transition-all group-hover:bg-navy-950/40 group-hover:opacity-100">
            <label className="inline-flex cursor-pointer items-center gap-1.5 bg-white px-3.5 py-2 text-xs font-semibold tracking-wide text-navy-950 uppercase">
              <ImagePlus size={14} /> {doc.cover ? 'Replace' : 'Add cover'}
              <input type="file" accept="image/*" onChange={onPickImage} className="sr-only" />
            </label>
            {doc.cover && (
              <button
                type="button"
                onClick={() => setDoc((d) => ({ ...d, cover: '' }))}
                className="grid h-8 w-8 cursor-pointer place-items-center bg-white text-navy-950 transition-colors hover:text-red-500"
                aria-label="Remove cover"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className={device === 'mobile' ? 'px-6 py-8' : 'px-14 py-12'}>
          {/* Which shelf this lands on. It sits above the meta line rather than
              in it because it is not part of the published article — it decides
              where the piece appears, not what it says. */}
          <div className="mb-5 inline-flex border border-navy-950/10 bg-white p-0.5">
            {(['article', 'news'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setDoc((d) => ({ ...d, kind: k }))}
                aria-pressed={doc.kind === k}
                className={`cursor-pointer px-3.5 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${
                  doc.kind === k
                    ? 'bg-blue-brand text-white'
                    : 'text-gray-500 hover:text-navy-950'
                }`}
              >
                {k === 'article' ? 'Article' : 'News'}
              </button>
            ))}
          </div>

          {/* meta line, exactly where it sits on the published article */}
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-teal-brand uppercase">
            <Editable
              initial={doc.category}
              onChange={(v) => setDoc((d) => ({ ...d, category: v }))}
              placeholder="Category"
              className="min-w-[6ch] outline-none"
            />
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{readMinutes} min read</span>
          </div>

          <Editable
            tag="h1"
            initial={doc.title}
            onChange={(v) => setDoc((d) => ({ ...d, title: v }))}
            placeholder="Article headline"
            className={`mt-4 font-display font-light tracking-normal text-navy-950 ${
              device === 'mobile' ? 'text-3xl' : 'text-4xl md:text-5xl'
            }`}
          />

          <Editable
            tag="p"
            initial={doc.description}
            onChange={(v) => setDoc((d) => ({ ...d, description: v }))}
            placeholder="A one or two sentence summary. This is what shows in the listing and in search results."
            className="mt-5 border-l-2 border-teal-brand/40 pl-4 text-lg leading-relaxed text-gray-600"
          />

          <div className="mt-8 space-y-1">
            {doc.blocks.map((b, i) => (
              <div key={b.id} data-block data-block-id={b.id} className="group/blk relative">
                <Editable
                  tag="p"
                  initial={b.text}
                  onChange={(v) =>
                    setDoc((d) => ({
                      ...d,
                      blocks: d.blocks.map((x) => (x.id === b.id ? { ...x, text: v } : x)),
                    }))
                  }
                  onEnter={() => addBlockAfter(i)}
                  placeholder={i === 0 ? 'Start writing the article…' : 'Continue…'}
                  className="py-1.5 text-base leading-relaxed text-gray-700"
                />
                {/* block controls, revealed on hover the way a page builder does */}
                <div className="absolute top-1 -left-11 flex flex-col gap-1 opacity-0 transition-opacity group-hover/blk:opacity-100">
                  <button
                    type="button"
                    onClick={() => addBlockAfter(i)}
                    aria-label="Add paragraph below"
                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-navy-950/10 bg-white text-gray-500 transition-colors hover:border-teal-brand/50 hover:text-teal-brand"
                  >
                    <Plus size={13} />
                  </button>
                  {doc.blocks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBlock(b.id)}
                      aria-label="Delete paragraph"
                      className="grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-navy-950/10 bg-white text-gray-400 transition-colors hover:border-red-300 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addBlockAfter(doc.blocks.length - 1)}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 border border-dashed border-navy-950/15 py-3 font-mono text-[10px] tracking-[0.2em] text-gray-400 uppercase transition-colors hover:border-teal-brand/50 hover:text-teal-brand"
          >
            <Plus size={13} /> Add paragraph
          </button>
        </div>
      </div>
    </div>
  )
}
