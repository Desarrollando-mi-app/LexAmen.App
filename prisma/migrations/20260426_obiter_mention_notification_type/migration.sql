-- Añade OBITER_MENTION al enum NotificationType. Se usa cuando un OD
-- menciona a un usuario con @handle.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'OBITER_MENTION';
