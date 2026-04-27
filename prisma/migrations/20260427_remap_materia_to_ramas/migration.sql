-- ─── Remapeo de valores legacy de `materia` a las ramas canónicas ──
--
-- Antes el campo `materia` usaba sub-áreas del derecho civil
-- (acto_juridico, obligaciones, contratos, bienes, sucesiones,
-- procesal_civil…). Migramos a las ramas del derecho chileno
-- (civil, penal, procesal, etc.) para que cualquier publicación
-- pueda clasificarse sin forzar.
--
-- Tablas afectadas: ObiterDictum, AnalisisSentencia, Ensayo.
-- DebateJuridico y Expediente ya usan `rama` por separado.
--
-- Idempotente: solo actualiza filas que aún tienen un valor legacy.

-- ObiterDictum
UPDATE "ObiterDictum" SET materia = 'civil'
  WHERE materia IN ('acto_juridico', 'obligaciones', 'contratos', 'bienes', 'sucesiones');
UPDATE "ObiterDictum" SET materia = 'procesal'
  WHERE materia = 'procesal_civil';
-- familia y otro se mantienen igual

-- AnalisisSentencia
UPDATE "AnalisisSentencia" SET materia = 'civil'
  WHERE materia IN ('acto_juridico', 'obligaciones', 'contratos', 'bienes', 'sucesiones');
UPDATE "AnalisisSentencia" SET materia = 'procesal'
  WHERE materia = 'procesal_civil';

-- Ensayo
UPDATE "Ensayo" SET materia = 'civil'
  WHERE materia IN ('acto_juridico', 'obligaciones', 'contratos', 'bienes', 'sucesiones');
UPDATE "Ensayo" SET materia = 'procesal'
  WHERE materia = 'procesal_civil';
