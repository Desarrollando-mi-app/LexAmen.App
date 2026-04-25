-- NoticiaJuridica — campos para contenido completo y pinning
--
-- contenido:    cuerpo completo de cartas al director / columnas / editoriales
--               (las noticias externas siguen usando solo titulo+resumen+urlFuente).
-- pinnedUntil:  fija el item en la portada del feed hasta esa fecha.
--               cartas/columnas → 7 días.
-- pinnedTop:    fija indefinidamente arriba del feed.
--               editoriales → hasta que el admin retire o publique una nueva.

ALTER TABLE "NoticiaJuridica" ADD COLUMN "contenido"   TEXT;
ALTER TABLE "NoticiaJuridica" ADD COLUMN "pinnedUntil" TIMESTAMP(3);
ALTER TABLE "NoticiaJuridica" ADD COLUMN "pinnedTop"   BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "NoticiaJuridica_pinnedTop_pinnedUntil_idx"
  ON "NoticiaJuridica"("pinnedTop", "pinnedUntil");
