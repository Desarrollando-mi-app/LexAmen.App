-- ObiterDictum.linkPreviews — JSON array de previews de URLs detectadas
-- en el contenido del obiter. Cada item: { url, title, description, image,
-- siteName, kind: "noticia" | "external" }. Se llena server-side en POST.

ALTER TABLE "ObiterDictum" ADD COLUMN "linkPreviews" TEXT;
