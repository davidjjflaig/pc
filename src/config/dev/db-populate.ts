/**
 * Das Modul enthält die Funktionalität, um die Test-DB neu zu laden.
 * @packageDocumentation
 */

/* eslint-disable @stylistic/quotes */

import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { PrismaClient } from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { dbDir, dbPopulate } from '../db.js';

/**
 * Die Test-DB wird im Development-Modus neu geladen, nachdem die Module
 * initialisiert sind, was durch `OnApplicationBootstrap` realisiert wird.
 */
@Injectable()
export class DbPopulateService implements OnApplicationBootstrap {
    readonly #dbDir = dbDir;
    readonly #prisma: PrismaClient;
    readonly #prismaAdmin: PrismaClient;
    readonly #logger = getLogger(DbPopulateService.name);

    /**
     * Initialisiert den Service mit zwei Prisma-Clients:
     * - `#prisma`: Läuft mit den Rechten des Anwendungsbenutzers (`pc_user`).
     * - `#prismaAdmin`: Läuft mit Admin-Rechten (`postgres`) für Operationen
     * wie `COPY`, die erweiterte Berechtigungen erfordern.
     */
    constructor() {
        const adapter = new PrismaPg({
            connectionString: process.env['DATABASE_URL'],
        });
        // PrismaClient für den Anwendungsbenutzer (z.B. pc_user)
        this.#prisma = new PrismaClient({ adapter, errorFormat: 'pretty' });

        const adapterAdmin = new PrismaPg({
            connectionString: process.env['DATABASE_URL_ADMIN'],
        });
        // PrismaClient für den Admin-Benutzer (postgres)
        this.#prismaAdmin = new PrismaClient({
            adapter: adapterAdmin,
            errorFormat: 'pretty',
        });
    }

    /**
     * Hook-Methode von NestJS, die beim Start der Anwendung aufgerufen wird.
     * Löst das Neuladen der Datenbank aus.
     */
    async onApplicationBootstrap() {
        await this.populate();
    }

    /**
     * Lädt die Datenbank neu, falls `dbPopulate` in der Konfiguration
     * aktiviert ist. Liest SQL-Skripte für DROP, CREATE und COPY
     * aus dem Dateisystem und führt sie aus.
     */
    async populate() {
        if (!dbPopulate) {
            this.#logger.info(
                'Das Neuladen der Datenbank ist deaktiviert (dbPopulate=false).',
            );
            return;
        }

        this.#logger.warn('Starte Neuladen der Datenbank...');

        const dropScript = path.resolve(this.#dbDir, 'drop-table.sql');
        this.#logger.debug('dropScript = %s', dropScript);
        const dropStatements = await readFile(dropScript, 'utf8');

        const createScript = path.resolve(this.#dbDir, 'create-table.sql');
        this.#logger.debug('createScript = %s', createScript);
        const createStatements = await readFile(createScript, 'utf8');

        const copyScript = path.resolve(this.#dbDir, 'copy-csv.sql');
        this.#logger.debug('copyScript = %s', copyScript);
        const copyStatements = await readFile(copyScript, 'utf8');

        // DROP und CREATE werden mit dem normalen Benutzer ausgeführt
        await this.#prisma.$connect();
        await this.#prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(dropStatements);
            await tx.$executeRawUnsafe(createStatements);
        });
        await this.#prisma.$disconnect();

        // COPY erfordert Admin-Rechte (pg_read_server_files)
        await this.#prismaAdmin.$connect();
        await this.#prismaAdmin.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(copyStatements);
        });
        await this.#prismaAdmin.$disconnect();

        this.#logger.warn('Neuladen der Datenbank erfolgreich abgeschlossen.');
    }
}
/* eslint-enable @stylistic/quotes */
