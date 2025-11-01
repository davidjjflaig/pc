-- Setzt den Suchpfad auf unser Schema
SET search_path TO pc_komponenten;

COPY hersteller (id, name, gruendungsjahr) FROM '/csv/hersteller.csv' WITH (FORMAT CSV, DELIMITER ';', HEADER TRUE);
COPY komponente (id, name, typ, preis, hersteller_id) FROM '/csv/komponente.csv' WITH (FORMAT CSV, DELIMITER ';', HEADER TRUE);
COPY spezifikation (komponente_id, kerntakt_mhz, speicher_gb, leserate_mbps) FROM '/csv/spezifikation.csv' WITH (FORMAT CSV, DELIMITER ';', HEADER TRUE);