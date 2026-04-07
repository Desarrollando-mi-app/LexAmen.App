/**
 * ExerciseWatermark — Marca de agua tenue "Studio IURIS" para cards de ejercicio.
 *
 * Uso: el contenedor padre debe tener `position: relative isolate` para
 * garantizar que la marca quede debajo del contenido sin afectar el resto
 * de la página.
 *
 *   <div className="relative isolate ...">
 *     <ExerciseWatermark />
 *     ... contenido del ejercicio ...
 *   </div>
 */
export function ExerciseWatermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 flex select-none items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <span
        className="whitespace-nowrap font-cormorant text-[48px] font-bold text-gz-ink/[0.03] lg:text-[64px]"
        style={{ transform: "rotate(-15deg)" }}
      >
        Studio IURIS
      </span>
    </div>
  );
}
