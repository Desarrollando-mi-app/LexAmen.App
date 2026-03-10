"use client";

import { useEffect, useState, useCallback } from "react";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  institution: string | null;
  universityYear: number | null;
  avatarUrl: string | null;
  plan: string;
  xp: number;
  isAdmin: boolean;
  suspended: boolean;
  deletedAt: string | null;
  createdAt: string;
  causasGanadas: number;
  causasPerdidas: number;
  _count: {
    flashcardProgress: number;
    mcqAttempts: number;
    trueFalseAttempts: number;
    badges: number;
  };
}

interface UsersData {
  users: UserRow[];
  total: number;
  page: number;
  totalPages: number;
}

export function UsuariosClient() {
  const [data, setData] = useState<UsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        plan,
        status,
        sort,
        order,
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, search, plan, status, sort, order]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleAction = async (userId: string, action: string) => {
    if (!confirm(`¿Confirmar acción "${action}" sobre este usuario?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        fetchUsers();
        if (selectedUser?.id === userId) setSelectedUser(null);
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSort = (field: string) => {
    if (sort === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setOrder("desc");
    }
    setPage(1);
  };

  const sortIcon = (field: string) =>
    sort === field ? (order === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy font-display italic">
        Usuarios
      </h1>

      {/* ── Filters ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy outline-none focus:ring-2 focus:ring-gold/30 w-64"
        />
        <select
          value={plan}
          onChange={(e) => {
            setPlan(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy"
        >
          <option value="">Todos los planes</option>
          <option value="FREE">Free</option>
          <option value="PREMIUM_MONTHLY">Premium Mensual</option>
          <option value="PREMIUM_ANNUAL">Premium Anual</option>
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy"
        >
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
          <option value="deleted">Eliminados</option>
          <option value="">Todos</option>
        </select>
        {data && (
          <span className="flex items-center text-sm text-navy/50">
            {data.total} usuario{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-navy/[0.03]">
              <th className="px-4 py-3 text-left font-medium text-navy/60">
                Usuario
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-navy/60 cursor-pointer hover:text-navy"
                onClick={() => toggleSort("email")}
              >
                Email{sortIcon("email")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-navy/60">
                Plan
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-navy/60 cursor-pointer hover:text-navy"
                onClick={() => toggleSort("xp")}
              >
                XP{sortIcon("xp")}
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-navy/60 cursor-pointer hover:text-navy"
                onClick={() => toggleSort("createdAt")}
              >
                Registro{sortIcon("createdAt")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-navy/60">
                Estado
              </th>
              <th className="px-4 py-3 text-right font-medium text-navy/60">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-4">
                    <div className="h-5 animate-pulse rounded bg-navy/5" />
                  </td>
                </tr>
              ))
            ) : data?.users.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-navy/40"
                >
                  Sin resultados
                </td>
              </tr>
            ) : (
              data?.users.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-navy/[0.02] transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(u)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                          {u.firstName[0]?.toUpperCase()}
                        </span>
                      )}
                      <span className="font-medium text-navy">
                        {u.firstName} {u.lastName}
                      </span>
                      {u.isAdmin && (
                        <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                          ADMIN
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-navy/70 max-w-[200px] truncate">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        u.plan === "FREE"
                          ? "bg-navy/10 text-navy/60"
                          : "bg-gold/20 text-gold"
                      }`}
                    >
                      {u.plan === "FREE"
                        ? "Free"
                        : u.plan === "PREMIUM_MONTHLY"
                        ? "Mensual"
                        : "Anual"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-navy/70">
                    {u.xp.toLocaleString("es-CL")}
                  </td>
                  <td className="px-4 py-3 text-navy/60">
                    {new Date(u.createdAt).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {u.deletedAt ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        Eliminado
                      </span>
                    ) : u.suspended ? (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                        Suspendido
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        Activo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(u);
                      }}
                      className="rounded-lg px-2 py-1 text-xs text-navy/50 hover:bg-navy/5 hover:text-navy"
                    >
                      Ver más
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-navy/50">
            Página {data.page} de {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-navy hover:bg-navy/5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-navy hover:bg-navy/5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* ── User Detail Modal ────────────────────────────── */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {selectedUser.avatarUrl ? (
                  <img
                    src={selectedUser.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy/10 text-lg font-bold text-navy">
                    {selectedUser.firstName[0]?.toUpperCase()}
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-bold text-navy">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-sm text-navy/60">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-navy/40 hover:text-navy text-xl"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-navy/[0.03] p-3">
                <p className="text-xs text-navy/50">XP</p>
                <p className="font-bold text-navy">
                  {selectedUser.xp.toLocaleString("es-CL")}
                </p>
              </div>
              <div className="rounded-lg bg-navy/[0.03] p-3">
                <p className="text-xs text-navy/50">Plan</p>
                <p className="font-bold text-navy">{selectedUser.plan}</p>
              </div>
              <div className="rounded-lg bg-navy/[0.03] p-3">
                <p className="text-xs text-navy/50">Causas</p>
                <p className="font-bold text-navy">
                  {selectedUser.causasGanadas}W /{" "}
                  {selectedUser.causasPerdidas}L
                </p>
              </div>
              <div className="rounded-lg bg-navy/[0.03] p-3">
                <p className="text-xs text-navy/50">Insignias</p>
                <p className="font-bold text-navy">
                  {selectedUser._count.badges}
                </p>
              </div>
              <div className="rounded-lg bg-navy/[0.03] p-3">
                <p className="text-xs text-navy/50">Flashcards</p>
                <p className="font-bold text-navy">
                  {selectedUser._count.flashcardProgress}
                </p>
              </div>
              <div className="rounded-lg bg-navy/[0.03] p-3">
                <p className="text-xs text-navy/50">MCQs</p>
                <p className="font-bold text-navy">
                  {selectedUser._count.mcqAttempts}
                </p>
              </div>
              <div className="rounded-lg bg-navy/[0.03] p-3">
                <p className="text-xs text-navy/50">Institución</p>
                <p className="font-bold text-navy text-xs">
                  {selectedUser.institution ?? "No especificada"}
                </p>
              </div>
              <div className="rounded-lg bg-navy/[0.03] p-3">
                <p className="text-xs text-navy/50">Registro</p>
                <p className="font-bold text-navy text-xs">
                  {new Date(selectedUser.createdAt).toLocaleDateString("es-CL")}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
              {!selectedUser.suspended && !selectedUser.deletedAt && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction(selectedUser.id, "suspend")}
                  className="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200 disabled:opacity-50"
                >
                  Suspender
                </button>
              )}
              {selectedUser.suspended && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction(selectedUser.id, "unsuspend")}
                  className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                >
                  Reactivar
                </button>
              )}
              {!selectedUser.isAdmin && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction(selectedUser.id, "makeAdmin")}
                  className="rounded-lg bg-gold/20 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/30 disabled:opacity-50"
                >
                  Hacer Admin
                </button>
              )}
              {selectedUser.isAdmin && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction(selectedUser.id, "removeAdmin")}
                  className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                >
                  Quitar Admin
                </button>
              )}
              <button
                disabled={actionLoading}
                onClick={() => handleAction(selectedUser.id, "resetXp")}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-navy/60 hover:bg-navy/5 disabled:opacity-50"
              >
                Reset XP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
