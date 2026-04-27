-- Añade el valor OBITER_REPLY al enum NotificationType. Antes las
-- respuestas reutilizaban OBITER_CITA con metadata.isReply, lo cual era
-- semánticamente incorrecto y dificultaba filtrar/agrupar en el inbox.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'OBITER_REPLY';
