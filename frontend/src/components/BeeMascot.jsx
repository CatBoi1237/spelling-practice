import { cn } from "@/lib/utils";

// Minimal geometric bee mascot. mood: idle | happy | sad | cheer
export function BeeMascot({ mood = "idle", className, size = 96 }) {
  const eyeY = mood === "sad" ? 46 : 44;
  const mouth =
    mood === "sad"
      ? "M44 58 Q52 52 60 58"
      : mood === "happy" || mood === "cheer"
      ? "M42 54 Q52 64 62 54"
      : "M45 57 Q52 60 59 57";
  return (
    <svg
      viewBox="0 0 104 104"
      width={size}
      height={size}
      className={cn("bee-mascot select-none", mood === "cheer" && "bee-cheer", mood === "idle" && "bee-idle", className)}
      role="img"
      aria-label="Bee mascot"
    >
      <g className="bee-wings" opacity="0.85">
        <ellipse cx="34" cy="30" rx="16" ry="10" fill="#bfdbfe" transform="rotate(-25 34 30)" />
        <ellipse cx="70" cy="30" rx="16" ry="10" fill="#bfdbfe" transform="rotate(25 70 30)" />
      </g>
      <ellipse cx="52" cy="58" rx="30" ry="26" fill="#f59e0b" />
      <path d="M30 46 Q52 40 74 46 L76 54 Q52 48 28 54Z" fill="#111827" />
      <path d="M28 64 Q52 58 76 64 L74 72 Q52 66 30 72Z" fill="#111827" />
      <circle cx="52" cy="40" r="17" fill="#fbbf24" />
      <line x1="44" y1="24" x2="38" y2="12" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="60" y1="24" x2="66" y2="12" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="38" cy="11" r="3" fill="#111827" />
      <circle cx="66" cy="11" r="3" fill="#111827" />
      {mood === "cheer" ? (
        <>
          <path d="M40 44 L46 40 L52 44" stroke="#111827" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M54 44 L60 40 L66 44" stroke="#111827" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="45" cy={eyeY} r="3.2" fill="#111827" />
          <circle cx="59" cy={eyeY} r="3.2" fill="#111827" />
          <circle cx="46" cy={eyeY - 1} r="1" fill="#fff" />
          <circle cx="60" cy={eyeY - 1} r="1" fill="#fff" />
        </>
      )}
      <path d={mouth} stroke="#111827" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {mood === "happy" || mood === "cheer" ? (
        <>
          <circle cx="38" cy="52" r="2.5" fill="#fb7185" opacity="0.7" />
          <circle cx="66" cy="52" r="2.5" fill="#fb7185" opacity="0.7" />
        </>
      ) : null}
      <path d="M52 84 L48 92 L56 92Z" fill="#111827" />
    </svg>
  );
}
