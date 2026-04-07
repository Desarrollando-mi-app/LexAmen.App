import { exerciseCode, type ExerciseType } from "@/lib/exercise-codes";

interface Props {
  type: ExerciseType;
  id: string;
  className?: string;
}

/**
 * Tiny code label shown in the top-right of an exercise card.
 * Designed to be very tenuous — only readable on close inspection.
 *
 * Usage: parent must be position: relative.
 */
export function ExerciseCodeBadge({ type, id, className = "" }: Props) {
  return (
    <span
      className={`pointer-events-none absolute right-2 top-2 z-10 select-none font-ibm-mono text-[9px] uppercase tracking-wider text-gz-ink-light/40 ${className}`}
      aria-hidden="true"
    >
      {exerciseCode(type, id)}
    </span>
  );
}
