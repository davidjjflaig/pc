-- Erstellt ein "user-private schema", das dem neuen Benutzer gehört.
-- Alle Tabellen werden innerhalb dieses Schemas angelegt.
CREATE SCHEMA IF NOT EXISTS pc_komponenten AUTHORIZATION pc_user;

-- Setzt den "search_path" für den Benutzer permanent.
-- Das bedeutet, wann immer sich 'pc_user' verbindet, ist 'pc_komponenten'
-- sein aktives/default Schema.
ALTER ROLE pc_user SET search_path = 'pc_komponenten';