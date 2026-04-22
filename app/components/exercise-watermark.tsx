import Image from "next/image";

/**
 * ExerciseWatermark — Marca de agua tenue del logo-sello para cards de ejercicio.
 *
 * Uso: el contenedor padre debe tener `relative isolate` para garantizar
 * que la marca quede debajo del contenido sin afectar el resto de la página.
 *
 *   <div className="relative isolate ...">
 *     <ExerciseWatermark />
 *     ... contenido del ejercicio ...
 *   </div>
 *
 * Variantes de tamaño:
 *   - "default": sello ~60% del ancho, apto para cards grandes de ejercicio
 *     (MCQ, TrueFalse, Flashcard, Simulacro, etc.)
 *   - "sm": sello ~40%, para cards pequeñas (opción futura).
 *
 * Opacidad en light mode: 4.5% (tinta sobre cream — efecto de sello en papel).
 * En dark mode invertimos el color y subimos a 8% para que siga siendo visible.
 */
interface ExerciseWatermarkProps {
  size?: "default" | "sm";
}

export function ExerciseWatermark({ size = "default" }: ExerciseWatermarkProps) {
  const sizeClass =
    size === "sm"
      ? "w-[min(42%,220px)]"
      : "w-[min(60%,360px)]";

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 flex select-none items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <Image
        src="/brand/logo-sello.svg"
        alt=""
        width={1024}
        height={1024}
        unoptimized
        priority={false}
        className={`${sizeClass} h-auto opacity-[0.045] dark:opacity-[0.08] dark:invert`}
      />
    </div>
  );
}
