-- Calendar event — campos extendidos
--
-- Se añaden campos de información contextual al CalendarEvent para que el
-- usuario pueda enriquecer cada evento con ubicación, URL, recurrencia,
-- aviso, materia jurídica e invitados. Todos opcionales para no romper
-- eventos existentes.

ALTER TABLE "CalendarEvent" ADD COLUMN "location"        TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "url"             TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "recurrence"      TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "reminderMinutes" INTEGER;
ALTER TABLE "CalendarEvent" ADD COLUMN "materia"         TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "attendees"       TEXT;
