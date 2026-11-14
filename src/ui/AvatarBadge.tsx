import type { AvatarConfig } from '../data/avatar'

/** Lightweight 2D portrait of the avatar (used in the HUD and menus; no extra WebGL context). */
export function AvatarBadge({ avatar, size = 48 }: { avatar: AvatarConfig; size?: number }) {
  const a = avatar
  const headRx = a.head === 'oval' ? 15 : 17
  const headRy = a.head === 'oval' ? 20 : 17
  const box = a.head === 'angular' || a.head === 'bot'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label={`${a.name} avatar`} role="img" className="shrink-0">
      <defs>
        <radialGradient id={`bg-${a.accent}`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor={a.accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor="#05010f" stopOpacity="1" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill={`url(#bg-${a.accent})`} stroke={a.accent} strokeWidth="2" />
      {/* shoulders */}
      <path d="M10 64 C12 48 20 44 32 44 C44 44 52 48 54 64 Z" fill={a.outfit === 'jacket' ? a.secondary : a.primary} />
      <path d="M26 46 L32 56 L38 46" stroke={a.accent} strokeWidth="2" fill="none" />
      {(a.armour === 'pauldrons' || a.armour === 'full') && (
        <>
          <rect x="8" y="47" width="12" height="7" rx="3" fill={a.secondary} stroke={a.accent} strokeWidth="1" />
          <rect x="44" y="47" width="12" height="7" rx="3" fill={a.secondary} stroke={a.accent} strokeWidth="1" />
        </>
      )}
      {/* hair back */}
      {a.hair === 'long' && <rect x="15" y="22" width="34" height="24" rx="6" fill={a.hairColor} />}
      {/* head */}
      {box ? (
        <rect x="15" y="12" width="34" height="32" rx={a.head === 'bot' ? 9 : 5} fill={a.head === 'bot' ? a.primary : a.skin} />
      ) : (
        <ellipse cx="32" cy="28" rx={headRx} ry={headRy} fill={a.skin} />
      )}
      {a.head === 'bot' && <rect x="19" y="21" width="26" height="14" rx="3" fill="#0b0b14" />}
      {/* hair top */}
      {a.hair !== 'none' && (box ? <rect x="14" y="9" width="36" height="8" rx="3" fill={a.hairColor} /> : <path d={`M${32 - headRx - 1} 27 A${headRx + 1} ${headRy + 1} 0 0 1 ${32 + headRx + 1} 27 Z`} fill={a.hairColor} />)}
      {a.hair === 'spikes' && <path d="M16 18 L20 4 L25 14 L32 2 L38 14 L44 4 L48 18 Z" fill={a.hairColor} />}
      {a.hair === 'mohawk' && <rect x="29" y="1" width="6" height="16" rx="2" fill={a.hairColor} />}
      {a.hair === 'bun' && <circle cx="32" cy="7" r="6" fill={a.hairColor} />}
      {a.hair === 'swoop' && <path d="M18 18 Q34 8 50 22 L40 16 Q30 16 18 22 Z" fill={a.hairColor} />}
      {/* eyes */}
      {a.face === 'visor' ? (
        <rect x="19" y="26" width="26" height="5" rx="2" fill={a.eyes} />
      ) : a.face === 'narrow' ? (
        <>
          <rect x="21" y="28" width="8" height="2" fill={a.eyes} />
          <rect x="35" y="28" width="8" height="2" fill={a.eyes} />
        </>
      ) : a.face === 'pixel' ? (
        <>
          <rect x="22" y="25" width="6" height="6" fill={a.eyes} />
          <rect x="36" y="25" width="6" height="6" fill={a.eyes} />
        </>
      ) : (
        <>
          <ellipse cx="25" cy="28" rx="3" ry="3.6" fill={a.eyes} />
          <ellipse cx="39" cy="28" rx="3" ry="3.6" fill={a.eyes} />
        </>
      )}
      {a.headGear === 'neon-visor' && <rect x="15" y="24" width="34" height="8" rx="3" fill={a.accent} opacity="0.6" />}
      {a.headGear === 'goggles' && <rect x="16" y="15" width="32" height="5" rx="2" fill="#0b0b14" stroke={a.accent} strokeWidth="1" />}
      {a.headGear === 'halo' && <ellipse cx="32" cy="5" rx="12" ry="3" fill="none" stroke={a.accent} strokeWidth="2" />}
      {a.headGear === 'antenna' && (
        <>
          <line x1="40" y1="12" x2="44" y2="2" stroke="#9aa3b8" strokeWidth="1.5" />
          <circle cx="44" cy="2.5" r="2.5" fill={a.accent} />
        </>
      )}
      {a.headGear === 'headphones' && (
        <>
          <rect x="11" y="22" width="6" height="12" rx="2" fill="#0b0b14" stroke={a.accent} />
          <rect x="47" y="22" width="6" height="12" rx="2" fill="#0b0b14" stroke={a.accent} />
        </>
      )}
    </svg>
  )
}
