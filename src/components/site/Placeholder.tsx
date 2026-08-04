import { ImageIcon } from 'lucide-react'

/**
 * Dashed frame marking where supplied imagery / visual assets will land.
 * Used across pages so every pending visual reads the same way.
 */
export default function ImagePlaceholder({
  label,
  className = '',
}: {
  label: string
  className?: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 border border-dashed border-teal-brand/30 bg-teal-brand/[0.04] ${className}`}
      role="img"
      aria-label={`Placeholder: ${label}`}
    >
      <ImageIcon size={20} className="text-teal-brand/50" aria-hidden="true" />
      <span className="px-4 text-center font-mono text-[9px] tracking-[0.25em] text-gray-500 uppercase">
        {label}
      </span>
    </div>
  )
}
