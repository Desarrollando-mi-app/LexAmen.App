"use client";

import { useState } from "react";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="px-3 py-1.5 text-xs"
        onClick={() => setShowModal(true)}
      >
        Cerrar sesión
      </Button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowModal(false)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-[4px] bg-white p-6 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-navy">¿Cerrar sesión?</h3>
            <p className="mt-2 text-sm text-navy/60">
              Tendrás que volver a iniciar sesión para acceder a tu cuenta.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-[3px] px-4 py-2 text-sm font-medium text-navy/70 transition-colors hover:bg-navy/5"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-[3px] bg-gz-burgundy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gz-burgundy/90"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
