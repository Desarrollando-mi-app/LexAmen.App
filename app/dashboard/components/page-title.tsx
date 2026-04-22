"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/dashboard": "Inicio",
  "/dashboard/flashcards": "Flashcards",
  "/dashboard/mcq": "Selección Múltiple",
  "/dashboard/truefalse": "Verdadero / Falso",
  "/dashboard/liga": "La Liga de la Toga",
  "/dashboard/la-toga": "La Liga de la Toga",
  "/dashboard/vida-del-derecho": "La Vida del Derecho",
  "/dashboard/causas": "Causas",
  "/dashboard/colegas": "Colegas",
  "/dashboard/perfil": "Perfil",
  "/dashboard/perfil/configuracion": "Configuración",
  "/dashboard/sala": "Profesión",
  "/dashboard/sala/ayudantias": "Ayudantías",
  "/dashboard/sala/pasantias": "Pasantías",
  "/dashboard/sala/ofertas": "Ofertas Laborales",
  "/dashboard/sala/networking": "Networking",
  "/dashboard/sala/eventos": "Eventos",
  "/dashboard/calendario": "Calendario",
  "/dashboard/simulacro": "Simulacro",
  "/dashboard/diario": "Publicaciones",
  "/dashboard/diario/analisis": "Análisis de Fallos",
  "/dashboard/diario/ensayos": "Ensayos",
  "/dashboard/diario/revista": "Revista",
  "/dashboard/diario/debates": "Debates",
  "/dashboard/diario/expediente": "Expediente Abierto",
  "/dashboard/diario/peer-review": "Peer Review",
  "/dashboard/diario/ranking": "Ranking de Autores",
  "/dashboard/ranking": "Ranking",
  "/dashboard/admin": "Panel Admin",
};

export function PageTitle() {
  const pathname = usePathname();

  // Buscar título exacto, luego prefijo más largo
  let title = TITLES[pathname];
  if (!title) {
    const match = Object.entries(TITLES)
      .filter(([path]) => pathname.startsWith(path) && path !== "/dashboard")
      .sort(([a], [b]) => b.length - a.length)[0];
    title = match ? match[1] : "";
  }

  if (!title || pathname === "/dashboard") return null;

  return (
    <span className="text-base font-bold text-navy font-cormorant truncate max-w-[200px]">
      {title}
    </span>
  );
}
