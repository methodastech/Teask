import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Post, PostKind, PostSection } from '../../lib/posts'
import { insertLink, toggleMarker } from '../../lib/richText'
import {
  Bold,
  Heading2,
  Heading3,
  Image,
  ImagePlus,
  Italic,
  Link2,
  Monitor,
  Pilcrow,
  Plus,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react'

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
  onFocus,
  placeholder,
  className,
  tag: Tag = 'div',
}: {
  initial: string
  onChange: (v: string) => void
  onEnter?: () => void
  onFocus?: () => void
  placeholder: string
  className?: string
  tag?: 'div' | 'h1' | 'h2' | 'h3' | 'p'
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
      onFocus={onFocus}
      onInput={(e: React.FormEvent<HTMLElement>) => onChange(e.currentTarget.innerText)}
      /**
       * Paste as text, never as markup.
       *
       * A paste out of Word or Google Docs carries fonts, colours and nested
       * elements. Left alone the browser drops all of it into the block, which
       * both smuggles styling into the published page and splits the block into
       * several nodes — and once that happens the offsets the formatting
       * buttons work from no longer match the text.
       *
       * execCommand is deprecated but has no replacement that keeps the
       * browser's own undo history intact, which is worth more here.
       */
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain').replace(/\s*\n+\s*/g, ' ').trim()
        if (text) document.execCommand('insertText', false, text)
      }}
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

/**
 * What a block is. Writing feels like one column of things in order, so that is
 * what the editor stores; sectionsFromBlocks folds it into the article shape on
 * save, and docFromPost unfolds it again.
 */
/**
 * A toolbar control.
 *
 * onMouseDown rather than onClick, and preventDefault: pressing a button moves
 * focus and clears the text selection, and the selection is the whole input to
 * bold, italic and link. By the time onClick fired there would be nothing left
 * to act on.
 */
function ToolButton({
  label,
  icon: Icon,
  onPress,
  active = false,
  disabled = false,
}: {
  label: string
  icon: typeof Bold
  onPress: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        if (!disabled) onPress()
      }}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid h-7 w-8 cursor-pointer place-items-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active
          ? 'bg-white text-blue-brand shadow-sm'
          : 'text-gray-400 hover:text-navy-950 disabled:hover:text-gray-400'
      }`}
    >
      <Icon size={14} strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
    </button>
  )
}

export type BlockType = 'heading' | 'subheading' | 'paragraph' | 'image'

/**
 * The four things a block can be. There is no font size control on purpose:
 * sizes chosen by hand drift apart across articles and stop meaning anything.
 * Heading and Subheading carry the article's structure — which is also what
 * search engines read — and the type scale follows from that.
 */
const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading', icon: Heading2 },
  { type: 'subheading', label: 'Subheading', icon: Heading3 },
  { type: 'paragraph', label: 'Paragraph', icon: Pilcrow },
  { type: 'image', label: 'Image', icon: Image },
] as const satisfies ReadonlyArray<{ type: BlockType; label: string; icon: unknown }>

export interface EditorBlock {
  id: number
  type: BlockType
  /** the text, or for an image block, its alt text */
  text: string
  /** image blocks only */
  src?: string
}

export interface EditorDoc {
  /** set when editing something already published; absent means a new piece */
  slug?: string
  kind: PostKind
  title: string
  category: string
  description: string
  cover: string
  blocks: EditorBlock[]
}

export const emptyDoc = (): EditorDoc => ({
  kind: 'article',
  title: '',
  category: '',
  description: '',
  cover: '',
  blocks: [{ id: 1, type: 'paragraph', text: '' }],
})

/** flat blocks → the sectioned shape an article is stored and rendered in */
export function sectionsFromBlocks(blocks: EditorBlock[]): PostSection[] {
  const sections: PostSection[] = []
  let current: PostSection | null = null

  const open = (heading?: string, level?: 2 | 3): PostSection => {
    const section: PostSection = { paragraphs: [] }
    if (heading) {
      section.heading = heading
      section.headingLevel = level
    }
    sections.push(section)
    return section
  }

  for (const block of blocks) {
    const text = block.type === 'image' ? block.text : block.text.trim()

    if (block.type === 'heading' || block.type === 'subheading') {
      if (!text) continue
      current = open(text, block.type === 'heading' ? 2 : 3)
      continue
    }

    if (block.type === 'image') {
      if (!block.src) continue
      // an image closes the run it sits in, so whatever follows starts fresh
      current ??= open()
      current.image = { src: block.src, alt: text }
      current = null
      continue
    }

    if (!text) continue
    current ??= open()
    current.paragraphs.push(text)
  }

  return sections.filter((s) => s.heading || s.paragraphs.length > 0 || s.image)
}

/** Load a published article back into the editor, block for block. */
export const docFromPost = (post: Post): EditorDoc => {
  let id = 0
  const blocks: EditorBlock[] = []

  for (const section of post.sections) {
    if (section.heading) {
      blocks.push({
        id: ++id,
        type: section.headingLevel === 3 ? 'subheading' : 'heading',
        text: section.heading,
      })
    }
    for (const paragraph of section.paragraphs) {
      blocks.push({ id: ++id, type: 'paragraph', text: paragraph })
    }
    if (section.image?.src) {
      blocks.push({ id: ++id, type: 'image', text: section.image.alt ?? '', src: section.image.src })
    }
  }

  return {
    slug: post.slug,
    kind: post.kind ?? 'article',
    title: post.title,
    category: post.category,
    description: post.description,
    cover: post.cover,
    blocks: blocks.length ? blocks : [{ id: 1, type: 'paragraph', text: '' }],
  }
}

export default function PostEditor({
  doc,
  setDoc,
  onPublish,
  onExit,
  readMinutes,
  onPickImage,
  uploadImage,
  saving = false,
}: {
  doc: EditorDoc
  setDoc: (fn: (d: EditorDoc) => EditorDoc) => void
  onPublish: () => void
  onExit: () => void
  readMinutes: number
  onPickImage: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** upload a body image; resolves to its URL, or null if it was rejected */
  uploadImage: (file: File) => Promise<string | null>
  /** a save is in flight — publishing now writes over the network */
  saving?: boolean
}) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const nextId = useRef(1000)
  const focusBlock = useRef<number | null>(null)
  // the block the toolbar acts on. Kept after blur, because clicking a toolbar
  // button takes focus out of the text and there would be nothing to act on.
  const [activeId, setActiveId] = useState<number | null>(null)
  const activeType = doc.blocks.find((b) => b.id === activeId)?.type ?? null

  // The canvas writes two kinds of thing and the toggle above decides which.
  // The prompts have to follow it, or the page says "article" while the shelf
  // it is going to says news.
  const isNews = doc.kind === 'news'
  const noun = isNews ? 'news entry' : 'article'

  // focus a freshly inserted block once it exists in the DOM
  useEffect(() => {
    if (focusBlock.current === null) return
    const el = document.querySelector<HTMLElement>(`[data-block-id="${focusBlock.current}"] [data-editable]`)
    el?.focus()
    focusBlock.current = null
  })

  const addBlockAfter = (index: number, type: BlockType = 'paragraph') => {
    const id = ++nextId.current
    setDoc((d) => {
      const blocks = [...d.blocks]
      blocks.splice(index + 1, 0, { id, type, text: '' })
      return { ...d, blocks }
    })
    if (type !== 'image') focusBlock.current = id
  }

  const removeBlock = (id: number) =>
    setDoc((d) => ({ ...d, blocks: d.blocks.length > 1 ? d.blocks.filter((b) => b.id !== id) : d.blocks }))

  const patchBlock = (id: number, patch: Partial<EditorBlock>) =>
    setDoc((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }))

  /**
   * The words the writer has selected, as offsets into the block's plain text.
   *
   * A block is an uncontrolled contentEditable holding text, not markup, so
   * formatting works by splicing markers into that text and rewriting the node
   * once. The DOM's own formatting commands would produce HTML, which is
   * exactly what this editor has chosen not to store.
   */
  function currentSelection() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

    const range = selection.getRangeAt(0)
    const node =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as HTMLElement)
        : range.startContainer.parentElement
    const el = node?.closest<HTMLElement>('[data-editable]')
    const holder = el?.closest<HTMLElement>('[data-block-id]')
    if (!el || !holder) return null

    const before = range.cloneRange()
    before.selectNodeContents(el)
    before.setEnd(range.startContainer, range.startOffset)

    const start = before.toString().length
    const selected = range.toString()
    if (!selected.trim()) return null

    return { el, id: Number(holder.dataset.blockId), start, end: start + selected.length, selected }
  }

  /**
   * Replace a block's text and put the writer back where they were.
   *
   * Assigning innerText throws away every child node, and with them the caret.
   * Without restoring it the browser drops the insertion point at the start of
   * the block, so the next word typed lands in front of the paragraph instead
   * of where the writer is looking — which is what made formatted text come
   * out scrambled.
   */
  const writeBlockText = (
    el: HTMLElement,
    id: number,
    text: string,
    select: [number, number],
  ) => {
    el.innerText = text
    patchBlock(id, { text })

    el.focus()
    const node = el.firstChild
    const selection = window.getSelection()
    if (!node || !selection) return

    const length = node.textContent?.length ?? 0
    const clamp = (n: number) => Math.min(Math.max(n, 0), length)

    const range = document.createRange()
    range.setStart(node, clamp(select[0]))
    range.setEnd(node, clamp(select[1]))
    selection.removeAllRanges()
    selection.addRange(range)
  }

  /**
   * Wrap the selection in a marker, or take it off if it is already there.
   * The same words stay selected afterwards, so bold then italic is two
   * keystrokes rather than two selections.
   */
  const toggleWrap = (marker: string) => {
    const sel = currentSelection()
    if (!sel) return
    const { el, id, start, end } = sel
    const edit = toggleMarker(el.innerText, start, end, marker)
    writeBlockText(el, id, edit.text, edit.select)
  }

  const addLink = () => {
    const sel = currentSelection()
    if (!sel) {
      window.alert('Select the words you want to turn into a link first.')
      return
    }
    const url = window.prompt('Link to where?', 'https://')?.trim()
    if (!url || url === 'https://') return

    const { el, id, start, end } = sel
    const edit = insertLink(el.innerText, start, end, url)
    writeBlockText(el, id, edit.text, edit.select)
  }

  /** change what the focused block is */
  const setActiveType = (type: BlockType) => {
    if (activeId === null) return
    patchBlock(activeId, { type })
    if (type !== 'image') focusBlock.current = activeId
  }

  const insertImage = () => {
    const at = doc.blocks.findIndex((b) => b.id === activeId)
    addBlockAfter(at === -1 ? doc.blocks.length - 1 : at, 'image')
  }

  // Ctrl/Cmd+B and +I are what everyone's fingers already do. Intercepted
  // because the browser's own would write markup into the contentEditable.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'b' || key === 'i') {
        e.preventDefault()
        toggleWrap(key === 'b' ? '**' : '_')
      } else if (key === 'k') {
        e.preventDefault()
        addLink()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const pickBlockImage = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const src = await uploadImage(file)
    if (src) patchBlock(id, { src })
  }

  const canPublish =
    doc.title.trim() &&
    doc.description.trim() &&
    doc.blocks.some((b) => (b.type === 'image' ? b.src : b.text.trim()))

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
          {doc.slug ? 'Editing' : 'Draft'} · {readMinutes} min read
        </span>
        {/* ── what the focused block is ── */}
        <div className="flex items-center gap-0.5 rounded-lg border border-navy-950/10 bg-paper p-0.5">
          {BLOCK_TYPES.filter((t) => t.type !== 'image').map(({ type, label, icon: Icon }) => (
            <ToolButton
              key={type}
              label={`${label} — turns the block you are in into a ${label.toLowerCase()}`}
              icon={Icon}
              active={activeType === type}
              disabled={activeId === null || activeType === 'image'}
              onPress={() => setActiveType(type)}
            />
          ))}
        </div>

        {/* ── formatting inside the text ── */}
        <div className="flex items-center gap-0.5 rounded-lg border border-navy-950/10 bg-paper p-0.5">
          <ToolButton label="Bold (Ctrl+B)" icon={Bold} onPress={() => toggleWrap('**')} />
          <ToolButton label="Italic (Ctrl+I)" icon={Italic} onPress={() => toggleWrap('_')} />
          <ToolButton label="Add a link (Ctrl+K)" icon={Link2} onPress={addLink} />
        </div>

        {/* ── put something in ── */}
        <div className="flex items-center rounded-lg border border-navy-950/10 bg-paper p-0.5">
          <ToolButton label="Insert an image below this block" icon={Image} onPress={insertImage} />
        </div>

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
            disabled={!canPublish || saving}
            className="cursor-pointer bg-blue-brand px-6 py-2.5 text-xs font-semibold tracking-[0.15em] text-white uppercase transition-colors hover:bg-teal-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Saving…' : doc.slug ? 'Save changes' : 'Publish'}
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
            placeholder={isNews ? 'News headline' : 'Article headline'}
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
                {b.type === 'image' ? (
                  <div className="my-4">
                    {b.src ? (
                      <img src={b.src} alt={b.text} className="w-full object-cover" />
                    ) : (
                      <label className="flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-navy-950/15 bg-paper text-gray-400 transition-colors hover:border-teal-brand/50 hover:text-teal-brand">
                        <ImagePlus size={20} strokeWidth={1.5} />
                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
                          Choose an image
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => void pickBlockImage(b.id, e)}
                          className="sr-only"
                        />
                      </label>
                    )}
                    {/* alt text is what a screen reader and a search engine read
                        in place of the picture, so it is asked for inline */}
                    {b.src && (
                      <Editable
                        initial={b.text}
                        onChange={(v) => patchBlock(b.id, { text: v })}
                        onFocus={() => setActiveId(b.id)}
                        placeholder="Describe this image (shown if it fails to load, and read aloud)"
                        className="mt-2 text-center text-xs text-gray-500 outline-none"
                      />
                    )}
                  </div>
                ) : (
                  <Editable
                    tag={b.type === 'heading' ? 'h2' : b.type === 'subheading' ? 'h3' : 'p'}
                    initial={b.text}
                    onChange={(v) => patchBlock(b.id, { text: v })}
                    onEnter={() => addBlockAfter(i)}
                    onFocus={() => setActiveId(b.id)}
                    placeholder={
                      b.type === 'heading'
                        ? 'Section heading'
                        : b.type === 'subheading'
                          ? 'Subheading'
                          : i === 0
                            ? `Start writing the ${noun}…`
                            : 'Continue…'
                    }
                    className={
                      b.type === 'heading'
                        ? 'mt-8 font-display text-2xl font-medium tracking-normal text-navy-950 md:text-3xl'
                        : b.type === 'subheading'
                          ? 'mt-6 font-display text-lg font-medium tracking-normal text-navy-950 md:text-xl'
                          : 'py-1.5 text-base leading-relaxed text-gray-700'
                    }
                  />
                )}

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
                      aria-label="Delete this block"
                      className="grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-navy-950/10 bg-white text-gray-400 transition-colors hover:border-red-300 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>

          {/* adding to the end is the common move, so each kind gets its own
              button rather than add-then-change-type */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => addBlockAfter(doc.blocks.length - 1, type)}
                className="flex cursor-pointer items-center justify-center gap-1.5 border border-dashed border-navy-950/15 py-3 font-mono text-[10px] tracking-[0.15em] text-gray-400 uppercase transition-colors hover:border-teal-brand/50 hover:text-teal-brand"
              >
                <Icon size={12} strokeWidth={1.75} /> {label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            Select words first, then use <strong className="font-semibold">B</strong>,{' '}
            <em>I</em> or the link button in the bar above. Ctrl+B, Ctrl+I, Ctrl+K.
          </p>
        </div>
      </div>
    </div>
  )
}
