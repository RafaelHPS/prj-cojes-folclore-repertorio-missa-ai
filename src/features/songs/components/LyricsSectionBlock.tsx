import type { DisplayedSection } from '../lyrics.util'

export type LyricsTextSize = 'text-base' | 'text-lg' | 'text-xl'

interface LyricsSectionBlockProps {
  section: DisplayedSection
  textSize: LyricsTextSize
}

function RepeatTag({ repeat }: { repeat: string | null }) {
  if (!repeat) return null
  return (
    <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-bold normal-case tracking-normal text-on-surface-variant">
      {repeat}
    </span>
  )
}

function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </>
  )
}

/** Um bloco da letra: refrão destacado, estrofe numerada ou trecho de diálogo/solo. */
export function LyricsSectionBlock({ section, textSize }: LyricsSectionBlockProps) {
  if (section.type === 'refrain') {
    return (
      <div
        className={`rounded-2xl border-l-4 border-primary bg-primary/5 px-4 py-3 ${section.isRepeatedRefrain ? 'opacity-60' : ''}`}
      >
        <p className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-primary">
          Refrão
          {section.label && !['R.', 'R:', 'Refrão'].includes(section.label) && (
            <span className="normal-case tracking-normal">{section.label}</span>
          )}
          <RepeatTag repeat={section.repeat} />
        </p>
        <p className={`font-semibold leading-relaxed text-on-surface ${textSize}`}>
          <Lines lines={section.lines} />
        </p>
      </div>
    )
  }

  if (section.type === 'other') {
    return (
      <div className="px-1">
        {section.label && (
          <p className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-outline">
            {section.label}
            <RepeatTag repeat={section.repeat} />
          </p>
        )}
        <p className={`italic leading-relaxed text-on-surface-variant ${textSize}`}>
          <Lines lines={section.lines} />
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-3 px-1">
      <span
        aria-hidden={section.label === null}
        className="w-7 flex-shrink-0 pt-0.5 text-right text-sm font-extrabold text-outline"
      >
        {section.label}
      </span>
      <div className="min-w-0">
        <p className={`leading-relaxed text-on-surface ${textSize}`}>
          <Lines lines={section.lines} />
        </p>
        {section.repeat && (
          <div className="mt-1">
            <RepeatTag repeat={section.repeat} />
          </div>
        )}
      </div>
    </div>
  )
}
