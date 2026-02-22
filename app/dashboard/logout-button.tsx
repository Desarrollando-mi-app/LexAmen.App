"use client";

import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline" className="px-3 py-1.5 text-xs">
        Cerrar sesión
      </Button>
    </form>
  );
}
