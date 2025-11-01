-- Erstellt das Schema PC-Komponenten
CREATE SCHEMA IF NOT EXISTS pc_komponenten;

-- Setzt den Suchpfad, damit nicht immer "pc_komponenten." geschreiben werden muss
SET search_path TO pc_komponenten;

-- Erstellt einen eigenen Datentyp für die Komponentenart
CREATE TYPE komponententyp AS ENUM ('CPU', 'GPU', 'RAM', 'SSD');

-- Tabelle für die Hersteller
CREATE TABLE IF NOT EXISTS hersteller (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    gruendungsjahr  INTEGER CHECK (gruendungsjahr > 1900)
);

-- Tabelle für die Komponenten
CREATE TABLE IF NOT EXISTS komponente (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    version         INTEGER NOT NULL DEFAULT 0,
    name            TEXT NOT NULL,
    typ             komponententyp,
    preis           DECIMAL(8, 2) NOT NULL CHECK (preis > 0),
    hersteller_id   INTEGER NOT NULL REFERENCES hersteller ON DELETE RESTRICT
);

-- Tabelle für die 1:1-Spezifikationen
CREATE TABLE IF NOT EXISTS spezifikation (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kerntakt_mhz    INTEGER CHECK (kerntakt_mhz > 0),
    speicher_gb     INTEGER CHECK (speicher_gb > 0),
    leserate_mbps   INTEGER CHECK (leserate_mbps > 0),
    komponente_id   INTEGER NOT NULL UNIQUE REFERENCES komponente ON DELETE CASCADE
);
-- Erstellt einen Index für den Foreign Key, um Abfragen zu beschleunigen
CREATE INDEX IF NOT EXISTS spezifikation_komponente_id_idx ON spezifikation(komponente_id);