-- ─── Bucket: citaciones-externas ──────────────────────────────
--
-- Sprint 3 (Imprenta · III). Almacena PDFs de evidencia que los
-- autores adjuntan al declarar una cita externa para que la
-- redacción de Studio IURIS verifique. Acceso PRIVADO. Solo el
-- declarante o un admin (User.isAdmin = true) puede generar
-- Signed URLs (1h) para descargar.
--
-- Path convention: `{userId}/{citaId}.pdf` (upsert false).
-- Tamaño máximo: 10 MB. MIME type: application/pdf.
--
-- Ejecutar en el SQL Editor del dashboard de Supabase. Idempotente
-- gracias a ON CONFLICT.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'citaciones-externas',
  'citaciones-externas',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── RLS: lectura privada (autor o admin) ─────────────────────
DROP POLICY IF EXISTS "citaciones_externas_owner_or_admin_read" ON storage.objects;
CREATE POLICY "citaciones_externas_owner_or_admin_read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'citaciones-externas' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM "User"
      WHERE id = auth.uid()::text
        AND "isAdmin" = true
    )
  )
);

-- ─── RLS: upload solo el dueño en su carpeta ──────────────────
DROP POLICY IF EXISTS "citaciones_externas_owner_upload" ON storage.objects;
CREATE POLICY "citaciones_externas_owner_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'citaciones-externas' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ─── RLS: el dueño puede borrar su propio PDF ────────────────
DROP POLICY IF EXISTS "citaciones_externas_owner_delete" ON storage.objects;
CREATE POLICY "citaciones_externas_owner_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'citaciones-externas' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
