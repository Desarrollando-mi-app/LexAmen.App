import Image from "next/image";
import { GzMastheadNav } from "./gz-masthead-nav";

function formatFechaEspanol(): string {
  const now = new Date();
  const dias = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return `${dias[now.getDay()]} ${now.getDate()} de ${meses[now.getMonth()]}, ${now.getFullYear()}`;
}

export function GzMasthead() {
  const fecha = formatFechaEspanol();

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
            width={100}
            height={100}
            className="h-[80px] w-[80px] lg:h-[100px] lg:w-[100px] rounded-full overflow-hidden flex-shrink-0"
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

        {/* === DERECHA: Fecha + Edición + URL === */}
        <div className="text-right hidden lg:block flex-shrink-0">
          <div className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
            {fecha}
          </div>
          <div className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mt-1">
            Edición diaria · Santiago, Chile
          </div>
          <div className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mt-1">
            studioiuris.cl
          </div>
        </div>
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
