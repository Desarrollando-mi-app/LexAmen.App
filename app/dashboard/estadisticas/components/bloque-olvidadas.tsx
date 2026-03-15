"use client";

interface BloqueOlvidadasProps {
  olvidadas: Array<{
    libro: string;
    label: string;
    diasSinPracticar: number;
    nivelDominio: number;
    enCedulario: boolean;
  }>;
  materiasAlDia: number;
}

function DominioBar({ nivel }: { nivel: number }) {
  const color =
    nivel >= 70
      ? "bg-gz-sage"
      : nivel >= 40
      ? "bg-gz-gold"
      : "bg-gz-burgundy";

  return (
    <div className="flex items-center gap-2 w-full max-w-[120px]">
      <div className="flex-1 h-[5px] bg-gz-cream-dark rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${nivel}%` }}
        />
      </div>
      <span className="font-ibm-mono text-[10px] text-gz-ink-light w-8 text-right">
        {nivel}%
      </span>
    </div>
  );
}

export function BloqueOlvidadas({
  olvidadas,
  materiasAlDia,
}: BloqueOlvidadasProps) {
  return (
    <div className="bg-white border border-gz-rule rounded-[4px] p-5">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light font-medium">
            Materias olvidadas
          </h3>
          <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-burgundy bg-gz-burgundy/10 px-2 py-0.5 rounded-[2px]">
            +7 días sin practicar
          </span>
        </div>
        <div className="h-px bg-gz-rule" />
      </div>

      {/* Summary line */}
      <p className="font-archivo text-[12px] text-gz-ink-mid mb-3">
        {materiasAlDia > 0
          ? `${materiasAlDia} materia${materiasAlDia !== 1 ? "s" : ""} al día`
          : "Ninguna materia al día"}
        {olvidadas.length > 0 &&
          ` · ${olvidadas.length} pendiente${olvidadas.length !== 1 ? "s" : ""}`}
      </p>

      {olvidadas.length === 0 ? (
        <div className="text-center py-6">
          <p className="font-cormorant text-[16px] text-gz-sage !font-semibold">
            ¡Todas tus materias están al día!
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-light mt-1">
            Has practicado todas las materias en los últimos 7 días.
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {olvidadas.map((o) => (
            <div
              key={o.libro}
              className="flex items-center gap-3 py-2.5 border-b border-gz-cream-dark last:border-b-0"
            >
              {/* Alert icon */}
              <div
                className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] shrink-0 ${
                  o.diasSinPracticar >= 30
                    ? "bg-gz-burgundy/10 text-gz-burgundy"
                    : "bg-gz-gold/10 text-gz-gold"
                }`}
              >
                {o.diasSinPracticar >= 30 ? "⚠" : "⏰"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-archivo text-[13px] font-medium text-gz-ink truncate">
                    {o.label}
                  </p>
                  {o.enCedulario && (
                    <span className="font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-navy bg-gz-navy/10 px-1.5 py-0.5 rounded-[2px] shrink-0">
                      En cedulario
                    </span>
                  )}
                </div>
                <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                  {o.diasSinPracticar >= 999
                    ? "Sin practicar"
                    : `${o.diasSinPracticar} días sin practicar`}
                </p>
              </div>

              {/* Dominio bar */}
              <DominioBar nivel={o.nivelDominio} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
