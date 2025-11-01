-- Löscht alle Tabellen im Schema in der richtigen Reihenfolge
SET search_path TO pc_komponenten;

-- 1. Kinder (die auf andere Tabellen verweisen)
DROP TABLE IF EXISTS spezifikation;
DROP TABLE IF EXISTS komponente;

-- 2. Eltern (auf die verwiesen wird)
DROP TABLE IF EXISTS hersteller;

-- 3. Den Typ zuletzt
DROP TYPE IF EXISTS komponententyp;