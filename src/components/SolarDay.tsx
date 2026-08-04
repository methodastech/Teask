import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'

/**
 * A 24-hour day-line with the sun (daytime) or a crescent moon (night) at the
 * current Malaysia time (MYT, UTC+8). The marker creeps along now/24h; the
 * gradient reads night → day → night. Malaysia sits near the equator, so day
 * runs roughly 07:00–19:00 year-round.
 */

function malaysiaTime() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return {
    frac: (h * 60 + m) / 1440,
    label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    isDay: h >= 7 && h < 19,
  }
}

const W = 156

export default function SolarDay({ className = '' }: { className?: string }) {
  const [t, setT] = useState(malaysiaTime)
  useEffect(() => {
    const id = window.setInterval(() => setT(malaysiaTime()), 30000)
    return () => window.clearInterval(id)
  }, [])

  const markerX = t.frac * W
  const glow = t.isDay ? 'rgba(242,169,59,0.45)' : 'rgba(191,209,255,0.4)'

  return (
    <div className={`flex flex-col items-end ${className}`} aria-hidden="true">
      <div className="relative" style={{ width: W, height: 18 }}>
        {/* the day, night → day → night */}
        <div
          className="absolute top-1/2 h-px w-full -translate-y-1/2"
          style={{
            background:
              'linear-gradient(90deg,#1c2c50 0%,#2f6a8f 22%,#3bb1e3 38%,#f2a93b 50%,#3bb1e3 62%,#2f6a8f 78%,#1c2c50 100%)',
          }}
        />
        {/* 06 · 12 · 18 ticks */}
        {[0.25, 0.5, 0.75].map((f) => (
          <span
            key={f}
            className="absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-navy-950/15"
            style={{ left: f * W }}
          />
        ))}
        {/* sun by day, crescent moon by night */}
        <span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-1000 ease-linear"
          style={{ left: markerX }}
        >
          <span className="relative grid h-4 w-4 place-items-center">
            <motion.span
              className="absolute rounded-full"
              style={{ inset: -3, background: glow }}
              animate={{ scale: [1, 1.7, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            {t.isDay ? (
              <Sun
                size={15}
                strokeWidth={2.2}
                className="relative text-solar"
                style={{ filter: 'drop-shadow(0 0 4px #f2a93b)' }}
              />
            ) : (
              <Moon
                size={13}
                strokeWidth={2.2}
                className="relative text-pale-brand"
                style={{ filter: 'drop-shadow(0 0 4px rgba(191,209,255,0.9))' }}
              />
            )}
          </span>
        </span>
      </div>
      <span className="mt-1.5 font-mono text-[9px] tracking-[0.3em] text-gray-500 uppercase">
        Malaysia · {t.label} MYT
      </span>
    </div>
  )
}
