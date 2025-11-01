-- Erstellt einen neuen Benutzer (Rolle) mit Passwort
CREATE USER pc_user PASSWORD 'p';

-- Erstellt eine neue Datenbank
CREATE DATABASE pc_db;

-- Gibt dem neuen Benutzer alle Rechte auf seiner neuen Datenbank
GRANT ALL ON DATABASE pc_db TO pc_user;

-- Erstellt einen eigenen "Tablespace", einen dedizierten Speicherort für die Tabellendaten.
-- HINWEIS: Der Ordner '/var/lib/postgresql/tablespace/pc_komponenten' muss im
-- Docker Container existieren und die richtigen Berechtigungen haben.
CREATE TABLESPACE pc_komponenten_space OWNER pc_user LOCATION '/var/lib/postgresql/tablespace/pc_komponenten';