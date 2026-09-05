import type { ReactNode } from 'react'

/** Impact-style top/bottom caption overlay on a branded meme image. */
export function MemeCaptionPreview({
  imageUrl,
  topText = '',
  bottomText = '',
  className = '',
  maxHeightClass = 'max-h-56',
  selected = false,
  onClick,
  badge,
  compact = false,
}: {
  imageUrl: string
  topText?: string
  bottomText?: string
  className?: string
  maxHeightClass?: string
  selected?: boolean
  onClick?: () => void
  badge?: ReactNode
  compact?: boolean
}) {
  const top = String(topText || '').trim()
  const bottom = String(bottomText || '').trim()
  const stroke =
    '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 8px rgba(0,0,0,0.85)'

  const inner = (
    <>
      {badge != null && (
        <div className="absolute top-2 left-2 z-10">{badge}</div>
      )}
      <div className="relative bg-black leading-none">
        <img
          src={imageUrl}
          alt="Meme preview"
          className={`w-full object-contain bg-gray-950 ${maxHeightClass}`}
        />
        <div className="pointer-events-none absolute inset-0">
          {top && (
            <p
              className={[
                'absolute left-1/2 top-1.5 w-[92%] -translate-x-1/2 text-center font-black uppercase text-white',
                compact ? 'text-[10px] leading-tight' : 'text-sm sm:text-base leading-snug',
              ].join(' ')}
              style={{
                fontFamily: 'Impact, Haettenschweiler, "Arial Black", sans-serif',
                textShadow: stroke,
              }}
            >
              {top}
            </p>
          )}
          {bottom && (
            <p
              className={[
                'absolute bottom-1.5 left-1/2 w-[92%] -translate-x-1/2 text-center font-black uppercase text-white',
                compact ? 'text-[10px] leading-tight' : 'text-sm sm:text-base leading-snug',
              ].join(' ')}
              style={{
                fontFamily: 'Impact, Haettenschweiler, "Arial Black", sans-serif',
                textShadow: stroke,
              }}
            >
              {bottom}
            </p>
          )}
        </div>
      </div>
    </>
  )

  const shellClass = [
    'relative block w-full overflow-hidden rounded-lg border text-left',
    selected ? 'border-indigo-400 ring-2 ring-indigo-500/40' : 'border-gray-600',
    onClick ? 'cursor-pointer hover:border-indigo-400/80 transition-colors' : '',
    className,
  ].filter(Boolean).join(' ')

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shellClass}>
        {inner}
      </button>
    )
  }

  return <div className={shellClass}>{inner}</div>
}
