-- Add `ciudad` to User so el directorio de Networking pueda filtrar por
-- ciudad además de región. Las ciudades válidas se controlan en el cliente
-- (CIUDADES_CHILE de lib/sala-constants.ts).

ALTER TABLE "User" ADD COLUMN "ciudad" TEXT;
