/**
 * Das Modul besteht aus der Klasse {@linkcode PcWriteService} für die
 * Schreiboperationen im Anwendungskern.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { MailService } from '../../mail/mail-service.js';
import {
    VersionInvalidException,
    VersionOutdatedException,
} from './exceptions.js';
import { PcService } from './pc-service.js';
import { PrismaService } from './prisma-service.js';

/** Typdefinition für das Erstellen einer neuen Komponente. */
export type PcCreate = Prisma.KomponenteCreateInput;
/** Typdefinition für die Aktualisierung einer Komponente. */
export type PcUpdate = Prisma.KomponenteUpdateInput;

/** Typdefinition für das Ergebnis einer `create`-Operation. */
type PcCreated = Prisma.KomponenteGetPayload<{
    include: {
        hersteller: true;
        spezifikation: true;
    };
}>;

/** Typdefinition für die Parameter einer `update`-Operation. */
export type UpdateParams = {
    readonly id: number | undefined;
    readonly pc: PcUpdate;
    readonly version: string;
};
/** Typdefinition für das Ergebnis einer `update`-Operation. */
type PcUpdated = Prisma.KomponenteGetPayload<{}>;

/**
 * Die Klasse `PcWriteService` implementiert den Anwendungskern für das
 * Schreiben von PC-Komponenten und greift mit _Prisma_ auf die DB zu.
 */
@Injectable()
export class PcWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #prisma: PrismaClient;
    readonly #readService: PcService;
    readonly #mailService: MailService;
    readonly #logger = getLogger(PcWriteService.name);

    constructor(
        prisma: PrismaService,
        readService: PcService,
        mailService: MailService,
    ) {
        this.#prisma = prisma.client;
        this.#readService = readService;
        this.#mailService = mailService;
    }

    /**
     * Eine neue Komponente soll angelegt werden.
     * @param pc Die neu abzulegende Komponente.
     * @returns Die ID der neu angelegten Komponente.
     */
    async create(pc: PcCreate) {
        this.#logger.debug('create: pc=%o', pc);
        // Die Validierung (z.B. ob der Name schon existiert) wird hier vereinfacht
        // und man verlässt sich auf die @unique-Constraints im Prisma-Schema.

        let pcDb: PcCreated | undefined;
        await this.#prisma.$transaction(async (tx) => {
            pcDb = await tx.komponente.create({
                data: pc,
                include: { hersteller: true, spezifikation: true },
            });
        });

        // Mail versenden
        await this.#sendmail({
            id: pcDb?.id ?? 'N/A',
            name: pcDb?.name ?? 'N/A',
        });

        this.#logger.debug('create: pcDb.id=%s', pcDb?.id ?? 'N/A');
        return pcDb?.id ?? Number.NaN;
    }

    // addFile() wurde entfernt.

    /**
     * Eine vorhandene Komponente soll aktualisiert werden.
     * @param id ID der zu aktualisierenden Komponente.
     * @param pc Die zu aktualisierende Komponente.
     * @param version Versionsnummer für optimistische Synchronisation.
     * @returns Die neue Versionsnummer.
     * @throws NotFoundException falls keine Komponente zur ID vorhanden ist.
     * @throws VersionInvalidException falls die Versionsnummer ungültig ist.
     * @throws VersionOutdatedException falls die Versionsnummer veraltet ist.
     */
    async update({ id, pc, version }: UpdateParams) {
        this.#logger.debug(
            'update: id=%d, pc=%o, version=%s',
            id ?? Number.NaN,
            pc,
            version,
        );
        if (id === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundException(
                `Es gibt keine Komponente mit der ID ${id}.`,
            );
        }

        await this.#validateUpdate(id, version);

        pc.version = { increment: 1 };
        let pcUpdated: PcUpdated | undefined;
        await this.#prisma.$transaction(async (tx) => {
            pcUpdated = await tx.komponente.update({
                data: pc,
                where: { id },
            });
        });
        this.#logger.debug('update: pcUpdated=%s', JSON.stringify(pcUpdated));

        return pcUpdated?.version ?? Number.NaN;
    }

    /**
     * Eine Komponente wird asynchron anhand ihrer ID gelöscht.
     * @param id ID der zu löschenden Komponente.
     * @returns `true`, falls die Komponente vorhanden war und gelöscht wurde.
     */
    async delete(id: number) {
        this.#logger.debug('delete: id=%d', id);

        const pc = await this.#prisma.komponente.findUnique({
            where: { id },
        });
        if (pc === null) {
            this.#logger.debug('delete: not found');
            return false;
        }

        await this.#prisma.$transaction(async (tx) => {
            await tx.komponente.delete({ where: { id } });
        });

        this.#logger.debug('delete');
        return true;
    }

    // validateCreate (für ISBN) wurde entfernt.

    async #sendmail({ id, name }: { id: number | 'N/A'; name: string }) {
        const subject = `Neue Komponente ${id}`;
        const body = `Die Komponente mit dem Namen <strong>${name}</strong> ist angelegt`;
        await this.#mailService.sendmail({ subject, body });
    }

    async #validateUpdate(id: number, versionStr: string) {
        this.#logger.debug(
            '#validateUpdate: id=%d, versionStr=%s',
            id,
            versionStr,
        );
        if (!PcWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidException(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        // Ruft findById vom PcService auf
        const pcDb = await this.#readService.findById({ id });

        if (version < pcDb.version) {
            this.#logger.debug('#validateUpdate: versionDb=%d', version);
            throw new VersionOutdatedException(version);
        }
    }
}
