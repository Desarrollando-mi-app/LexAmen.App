import Image from "next/image";
import { GzMastheadNav } from "./gz-masthead-nav";

export function GzMasthead() {
  return (
    <header className="px-6 lg:px-10 pt-5 pb-0">
      {/* Row superior: marca izquierda + metadata derecha */}
      <div className="flex items-start justify-between mb-4">

        {/* === IZQUIERDA: Isotipo + Nombre texto + Lema === */}
        <div className="flex items-center gap-4">
          {/* Isotipo (rostro Justicia) — redondo */}
          <Image
            src="/brand/logo-isotipo.svg"
            alt="Studio Iuris"
            width={80}
            height={80}
            className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px] rounded-full overflow-hidden flex-shrink-0"
            priority
          />

          {/* Nombre + Lema */}
          <div>
            {/* "Studio" — font-archivo (sans-serif) */}
            <div className="font-archivo text-[20px] lg:text-[28px] font-bold tracking-[2px] text-gz-ink leading-none">
              Studio
            </div>
            {/* "IURIS" — font-cormorant (serif), MAYÚSCULAS, ROJO */}
            <div className="font-cormorant text-[26px] lg:text-[38px] !font-bold tracking-[4px] text-gz-red uppercase leading-none mt-[-2px]">
              IURIS
            </div>
            {/* Lema */}
            <p className="font-cormorant italic text-[11px] lg:text-[14px] text-gz-ink-mid mt-2 leading-snug">
              Plataforma de aprendizaje jurídico · Nuevos tiempos &amp; Nuevas herramientas
            </p>
          </div>
        </div>

        {/* Esquina derecha vacía — limpio */}
      </div>

      {/* Doble línea separadora */}
      <div className="relative border-b-2 border-gz-ink mb-0">
        <div className="absolute bottom-[-4px] left-0 right-0 h-px bg-gz-ink" />
      </div>

      {/* Nav — client component with dropdowns + active detection */}
      <GzMastheadNav />
    </header>
  );
}
