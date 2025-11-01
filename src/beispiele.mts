/* eslint-disable n/no-process-env */

/**
 * Das Modul ist ein eigenständiges Skript, um Lese-Operationen
 * mit Prisma gegen die PC-Komponenten-Datenbank zu testen.
 * @packageDocumentation
 */

import { PrismaPg } from '@prisma/adapter-pg';
import process from 'node:process';
import { PrismaClient, type Prisma } from './generated/prisma/client.ts';

/**
 * Typdefinition für eine Komponente inklusive der verknüpften
 * Relationen (Hersteller und Spezifikation).
 */
export type KomponenteMitDetails = Prisma.KomponenteGetPayload<{
    include: {
        hersteller: true;
        spezifikation: true;
    };
}>;

console.log(`Verbinde mit der Datenbank: ${process.env['DATABASE_URL']}\n`);
const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL'],
});
const prisma = new PrismaClient({
    adapter,
    log: [{ emit: 'event', level: 'query' }, 'info', 'warn', 'error'],
});

prisma.$on('query', (e) => {
    console.log(`Query: ${e.query}`);
    console.log(`Duration: ${e.duration} ms\n`);
});

/**
 * Hauptfunktion für die Datenbankabfragen.
 */
async function main() {
    try {
        await prisma.$connect();
        console.log(
            'Erfolgreich mit der Datenbank verbunden. Starte Abfragen...',
        );
        console.log('\n--- Suche alle Komponenten von "Nvidia" ---');

        const nvidiaKomponenten: KomponenteMitDetails[] =
            await prisma.komponente.findMany({
                where: {
                    hersteller: {
                        name: 'Nvidia',
                    },
                },
                include: {
                    hersteller: true,
                    spezifikation: true,
                },
            });

        if (nvidiaKomponenten.length > 0) {
            console.log(
                `\n${nvidiaKomponenten.length} Komponenten von Nvidia gefunden:`,
            );

            for (const komp of nvidiaKomponenten) {
                const spec = komp.spezifikation;
                const specInfo = spec
                    ? `(Takt: ${spec.kerntaktMhz || 'N/A'} MHz, Speicher: ${
                          spec.speicherGb || 'N/A'
                      } GB)`
                    : '(Keine Spezifikations-Daten vorhanden)';

                console.log(
                    `\n  - Name:      ${komp.name} [${komp.typ}]` +
                        `\n  - Preis:     ${komp.preis}€` +
                        `\n  - Details:   ${specInfo}`,
                );
            }
        } else {
            console.log('Keine Komponenten von Nvidia gefunden.');
        }
    } catch (error) {
        console.error('Ein Fehler ist aufgetreten:', error);
    } finally {
        console.log('\n--- Trenne Verbindung zur Datenbank ---');
        await prisma.$disconnect();
    }
}

main();
