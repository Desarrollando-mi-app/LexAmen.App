"use client";

import Link from "next/link";

export interface CausaRoomData {
  id: string;
  mode: string;
  status: string;
  rama: string | null;
  maxPlayers: number;
  createdAt: string;
  createdBy: { firstName: string };
  _count: { participants: number };
}

interface GzCausasWireProps {
  initialRooms: CausaRoomData[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

function modeLabel(mode: string): string {
  switch (mode) {
    case "2v2":
      return "Relámpago 1v1";
    case "individual":
      return "Grupal";
    default:
      return mode;
  }
}

export function GzCausasWire({ initialRooms }: GzCausasWireProps) {
  return (
    <div
      className="bg-gz-navy -mx-4 lg:-mx-10 px-4 lg:px-10 py-4 flex items-center gap-4 overflow-hidden mb-8 animate-gz-slide-up"
      style={{ animationDelay: "0.2s" }}
    >
      {/* Label */}
      <div className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold-bright whitespace-nowrap pr-4 border-r border-white/15 flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-gz-burgundy animate-gz-blink" />
        Causas en vivo
      </div>

      {/* Scrollable items */}
      <div className="flex gap-4 overflow-x-auto flex-1 gz-scrollbar-hide">
        {initialRooms.length === 0 ? (
          <p className="font-cormorant italic text-white/40 text-[14px] whitespace-nowrap">
            No hay causas activas en este momento
          </p>
        ) : (
          initialRooms.map((room) => (
            <Link
              key={room.id}
              href={`/dashboard/causas/${room.id}`}
              className="flex-shrink-0 min-w-[240px] bg-white/[0.06] border border-white/[0.08] rounded px-[18px] py-3 cursor-pointer hover:bg-white/10 hover:border-gz-gold transition-all"
            >
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold-bright mb-1">
                {modeLabel(room.mode)} · {room._count.participants}/{room.maxPlayers}{" "}
                {room.status === "active" && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-gz-blink ml-1" />
                )}
              </p>
              <p className="font-cormorant text-[16px] !font-bold text-white">
                {room.rama ?? "General"}
              </p>
              <p className="text-[11px] text-white/40 mt-1">
                @{room.createdBy.firstName.toLowerCase()} · {timeAgo(room.createdAt)}
              </p>
            </Link>
          ))
        )}
      </div>

      {/* Create button */}
      <Link
        href="/dashboard/causas"
        className="shrink-0 border border-dashed border-gz-gold bg-transparent px-6 py-3 rounded font-cormorant text-[15px] !font-bold text-gz-gold-bright hover:bg-[var(--gz-gold)]/15 transition-colors whitespace-nowrap hidden sm:block"
      >
        + Nueva Causa
      </Link>
    </div>
  );
}
