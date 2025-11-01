/* eslint-disable n/no-process-env */

// Aufruf:   pnpm i
//           pnpx prisma generate
//
//           pnpx tsx --env-file=.env src/beispiele-write.mts

import { PrismaPg } from '@prisma/adapter-pg';
import process from 'node:process';
import { PrismaClient, type Prisma } from './generated/prisma/client.ts';

console.log(`DATABASE_URL (Admin): ${process.env['DATABASE_URL_ADMIN']}`);
console.log('');

const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL_ADMIN'],
});

const prisma = new PrismaClient({
    adapter,
    errorFormat: 'pretty',
    log: [{ emit: 'event', level: 'query' }, 'info', 'warn', 'error'],
});

prisma.$on('query', (e) => {
    console.log(`Query: ${e.query}`);
    console.log(`Duration: ${e.duration} ms\n`);
});

// Definiert eine neue Komponente, die erstellt werden soll.
const neueKomponente: Prisma.KomponenteCreateInput = {
    name: 'Intel Core i5-14600K',
    typ: 'CPU',
    preis: 329.99,

    // N:1-Beziehung: Mit existierendem Hersteller (ID 3 = Intel) verbinden
    hersteller: {
        connect: { id: 3 },
    },

    // 1:1-Beziehung: Spezifikation direkt miterstellen
    spezifikation: {
        create: {
            kerntaktMhz: 3500,
        },
    },
};

type KomponenteCreated = Prisma.KomponenteGetPayload<{
    include: {
        hersteller: true;
        spezifikation: true;
    };
}>;

// Definiert die Update-Daten für eine existierende Komponente.
const updateKomponente: Prisma.KomponenteUpdateInput = {
    version: { increment: 1 }, // Für Optimistic Locking
    preis: 159.9,
};

type KomponenteUpdated = Prisma.KomponenteGetPayload<{}>;

// Führt die Schreib-Operationen in einer Transaktion aus.
try {
    await prisma.$connect();
    console.log('Verbindung für Schreib-Operationen hergestellt.');

    await prisma.$transaction(async (tx) => {
        // CREATE
        const pcDb: KomponenteCreated = await tx.komponente.create({
            data: neueKomponente,
            include: { hersteller: true, spezifikation: true },
        });
        console.log(`NEU ERSTELLT (ID: ${pcDb.id})`);
        console.log(`Name: ${pcDb.hersteller.name} ${pcDb.name}`);
        console.log(`Takt: ${pcDb.spezifikation?.kerntaktMhz} MHz\n`);

        // UPDATE
        // Aktualisiert die Komponente mit ID 50 (Samsung 990 Pro)
        const pcUpdated: KomponenteUpdated = await tx.komponente.update({
            data: updateKomponente,
            where: { id: 50 },
        });
        console.log(`AKTUALISIERT (ID: 50)`);
        console.log(`Neue Version: ${pcUpdated.version}\n`);

        // DELETE
        // Löscht die Komponente mit ID 40 (RAM)
        const pcGeloescht = await tx.komponente.delete({ where: { id: 40 } });
        console.log(`GELÖSCHT (ID: 40)`);
        console.log(`Gelöschter Name: ${pcGeloescht.name}\n`);
    });
} catch (error) {
    console.error('Fehler bei Schreib-Operationen:', error);
} finally {
    console.log('Verbindung wird getrennt.');
    await prisma.$disconnect();
}
/* eslint-enable n/no-process-env */
