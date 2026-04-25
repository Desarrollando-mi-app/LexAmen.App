import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    firstName, lastName, bio, universidad, sede, universityYear, cvAvailable,
    region, ciudad, corte, visibleEnRanking, visibleEnLiga,
    etapaActual, anioIngreso, anioEgreso, anioJura,
    empleoActual, cargoActual, especialidades, intereses, linkedinUrl,
  } = body;

  // Build update data (only provided fields)
  const data: Record<string, unknown> = {};
  if (typeof firstName === "string" && firstName.trim()) data.firstName = firstName.trim();
  if (typeof lastName === "string" && lastName.trim()) data.lastName = lastName.trim();
  if (typeof bio === "string") data.bio = bio.slice(0, 500);
  if (bio === null) data.bio = null;
  if (typeof universidad === "string" || universidad === null) data.universidad = universidad;
  if (typeof sede === "string" || sede === null) data.sede = sede;
  if (typeof universityYear === "number" && universityYear >= 1 && universityYear <= 7) {
    data.universityYear = universityYear;
  }
  if (typeof cvAvailable === "boolean") data.cvAvailable = cvAvailable;
  if (typeof region === "string" || region === null) data.region = region;
  if (typeof ciudad === "string" || ciudad === null) data.ciudad = ciudad;
  if (typeof corte === "string" || corte === null) data.corte = corte;
  if (typeof visibleEnRanking === "boolean") data.visibleEnRanking = visibleEnRanking;
  if (typeof visibleEnLiga === "boolean") data.visibleEnLiga = visibleEnLiga;

  // Professional profile fields
  const validEtapas = ["estudiante", "egresado", "abogado"];
  if (etapaActual === null) data.etapaActual = null;
  else if (typeof etapaActual === "string" && validEtapas.includes(etapaActual)) data.etapaActual = etapaActual;

  if (anioIngreso === null) data.anioIngreso = null;
  else if (typeof anioIngreso === "number" && anioIngreso >= 1950 && anioIngreso <= 2040) data.anioIngreso = anioIngreso;

  if (anioEgreso === null) data.anioEgreso = null;
  else if (typeof anioEgreso === "number" && anioEgreso >= 1950 && anioEgreso <= 2040) data.anioEgreso = anioEgreso;

  if (anioJura === null) data.anioJura = null;
  else if (typeof anioJura === "number" && anioJura >= 1950 && anioJura <= 2040) data.anioJura = anioJura;

  if (empleoActual === null) data.empleoActual = null;
  else if (typeof empleoActual === "string") data.empleoActual = empleoActual.slice(0, 100);

  if (cargoActual === null) data.cargoActual = null;
  else if (typeof cargoActual === "string") data.cargoActual = cargoActual.slice(0, 100);

  if (especialidades === null) data.especialidades = null;
  else if (Array.isArray(especialidades)) data.especialidades = JSON.stringify(especialidades);

  if (intereses === null) data.intereses = null;
  else if (Array.isArray(intereses)) data.intereses = JSON.stringify(intereses);

  if (linkedinUrl === null) data.linkedinUrl = null;
  else if (
    typeof linkedinUrl === "string" &&
    (linkedinUrl.startsWith("https://linkedin.com/") || linkedinUrl.startsWith("https://www.linkedin.com/"))
  ) data.linkedinUrl = linkedinUrl;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: authUser.id },
    data,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      bio: true,
      universidad: true,
      sede: true,
      universityYear: true,
      cvAvailable: true,
      region: true,
      ciudad: true,
      corte: true,
      visibleEnRanking: true,
      visibleEnLiga: true,
      etapaActual: true,
      anioIngreso: true,
      anioEgreso: true,
      anioJura: true,
      empleoActual: true,
      cargoActual: true,
      especialidades: true,
      intereses: true,
      linkedinUrl: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json({ user });
}
