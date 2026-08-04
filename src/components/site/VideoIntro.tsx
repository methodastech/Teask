import { useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { SectionHeading } from './Section'

/**
 * A short introduction video to Teask, sitting under the deployment band.
 *
 * Self-hosted, not embedded. This used to load a Google Drive iframe on click,
 * which meant the section could only ever be as reliable as a Drive share
 * setting — and when that setting was wrong the page rendered a "You need
 * access" request form in the middle of the homepage, signed in as whoever the
 * visitor happened to be. A file in `public/` cannot fail that way.
 *
 * Click-to-play is kept for weight: `preload="none"` means not a byte of the
 * video is fetched until someone asks for it, so the poster is all the section
 * costs on load. Swap `SRC` to change the video.
 */

const SRC = '/videos/teask-video.webm'
const POSTER = '/images/video-intro-poster.jpg'

export default function VideoIntro() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  /**
   * play() is called straight out of the click rather than left to an `autoPlay`
   * attribute on a freshly mounted element: the gesture is what buys us the
   * right to play with sound, and a React re-render puts a tick between the two
   * that some browsers won't credit.
   */
  const start = () => {
    setPlaying(true)
    videoRef.current?.play().catch(() => {
      // autoplay policy or a decode failure — the controls are showing by now,
      // so the visitor can still start it themselves
    })
  }

  return (
    <section className="relative w-full bg-white py-16 md:py-32" aria-label="Introduction video">
      <div className="shell">
        <SectionHeading
          eyebrow="Watch"
          title={
            <>
              See the T Station
              <br />
              <span className="text-teal-brand">in motion.</span>
            </>
          }
          intro="A short introduction to Teask, the portable solar station and the mission behind it."
        />

        <div className="mt-12 overflow-hidden border border-navy-950/10 shadow-[0_1px_3px_rgba(16,24,40,0.05),0_24px_50px_-12px_rgba(16,24,40,0.18)]">
          <div className="relative aspect-video w-full bg-navy-950">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              poster={POSTER}
              preload="none"
              playsInline
              controls={playing}
              onEnded={() => setPlaying(false)}
            >
              <source src={SRC} type="video/webm" />
            </video>

            {/* the play affordance, over the poster until the video is running */}
            {!playing && (
              <button
                type="button"
                onClick={start}
                aria-label="Play the introduction video"
                className="group absolute inset-0 block h-full w-full cursor-pointer"
              >
                <span className="absolute inset-0 grid place-items-center bg-navy-950/40 transition-colors duration-300 group-hover:bg-navy-950/25">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-teal-brand text-white shadow-[0_10px_30px_rgba(59,177,227,0.5)] transition-transform duration-300 group-hover:scale-110">
                    <Play size={28} className="ml-1" fill="currentColor" aria-hidden="true" />
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
