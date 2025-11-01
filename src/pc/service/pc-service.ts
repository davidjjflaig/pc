/**
 * Das Modul besteht aus der Klasse {@linkcode PcService}.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import {
    Komponententyp,
    Prisma,
    PrismaClient,
} from '../../generated/prisma/client.js';
import { type KomponenteInclude } from '../../generated/prisma/models/Komponente.js';
import { getLogger } from '../../logger/logger.js';
import { type Pageable } from './pageable.js';
import { PrismaService } from './prisma-service.js';
import { type Slice } from './slice.js';
import { type Suchparameter, suchparameterNamen } from './suchparameter.js';
import { WhereBuilder } from './where-builder.js';

/** Typdefinition für `findById` */
type FindByIdParams = {
    readonly id: number;
};

/**
 * Typdefinition für eine Komponente mit den zugehörigen Relationen
 * (Hersteller und Spezifikation).
 */
export type PcMitHerstellerUndSpezifikation = Prisma.KomponenteGetPayload<{
    include: {
        hersteller: true;
        spezifikation: true;
    };
}>;

/**
 * Die Klasse `PcService` implementiert das Lesen für PC-Komponenten und greift
 * mit _Prisma_ auf eine relationale DB zu.
 */
@Injectable()
export class PcService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #prisma: PrismaClient;
    readonly #whereBuilder: WhereBuilder;

    /**
     * Standard-Include-Objekt für Prisma, um immer Hersteller und
     * Spezifikation mitzuladen.
     */
    readonly #includeHerstellerSpez: KomponenteInclude = {
        hersteller: true,
        spezifikation: true,
    };

    readonly #logger = getLogger(PcService.name);

    constructor(prisma: PrismaService, whereBuilder: WhereBuilder) {
        this.#prisma = prisma.client;
        this.#whereBuilder = whereBuilder;
    }

    /**
     * Eine Komponente asynchron anhand ihrer ID suchen.
     * @param id ID der gesuchten Komponente.
     * @returns Die gefundene Komponente.
     * @throws NotFoundException falls keine Komponente mit der ID existiert.
     */
    async findById({
        id,
    }: FindByIdParams): Promise<Readonly<PcMitHerstellerUndSpezifikation>> {
        this.#logger.debug('findById: id=%d', id);

        const pc = await this.#prisma.komponente.findUnique({
            where: { id },
            include: this.#includeHerstellerSpez,
        });
        if (pc === null) {
            this.#logger.debug('Es gibt keine Komponente mit der ID %d', id);
            throw new NotFoundException(
                `Es gibt keine Komponente mit der ID ${id}.`,
            );
        }

        this.#logger.debug('findById: pc=%o', pc);
        return pc;
    }

    // findFileByBuchId() wurde entfernt.

    /**
     * Komponenten asynchron suchen.
     * @param suchparameter JSON-Objekt mit Suchparameter.
     * @param pageable Maximale Anzahl an Datensätzen und Seitennummer.
     * @returns Ein JSON-Array mit den gefundenen Komponenten.
     * @throws NotFoundException falls keine Komponenten gefunden wurden.
     */
    async find(
        suchparameter: Suchparameter | undefined,
        pageable: Pageable,
    ): Promise<Readonly<Slice<Readonly<PcMitHerstellerUndSpezifikation>>>> {
        this.#logger.debug(
            'find: suchparameter=%s, pageable=%o',
            JSON.stringify(suchparameter),
            pageable,
        );

        if (
            suchparameter === undefined ||
            Object.keys(suchparameter).length === 0
        ) {
            return await this.#findAll(pageable);
        }

        if (
            !this.#checkKeys(Object.keys(suchparameter)) ||
            !this.#checkEnums(suchparameter)
        ) {
            this.#logger.debug('Ungueltige Suchparameter');
            throw new NotFoundException('Ungueltige Suchparameter');
        }

        const where = this.#whereBuilder.build(suchparameter);
        const { number, size } = pageable;
        const pcs = await this.#prisma.komponente.findMany({
            where,
            skip: number * size,
            take: size,
            include: this.#includeHerstellerSpez,
        });
        if (pcs.length === 0) {
            this.#logger.debug('find: Keine Komponenten gefunden');
            throw new NotFoundException(
                `Keine Komponenten gefunden: ${JSON.stringify(
                    suchparameter,
                )}, Seite ${pageable.number}}`,
            );
        }
        const totalElements = await this.count();
        return this.#createSlice(pcs, totalElements);
    }

    /**
     * Anzahl aller Komponenten zurückliefern.
     * @returns Die Gesamtanzahl als Zahl.
     */
    async count() {
        this.#logger.debug('count');
        const count = await this.#prisma.komponente.count();
        this.#logger.debug('count: %d', count);
        return count;
    }

    async #findAll(
        pageable: Pageable,
    ): Promise<Readonly<Slice<PcMitHerstellerUndSpezifikation>>> {
        const { number, size } = pageable;
        const pcs = await this.#prisma.komponente.findMany({
            skip: number * size,
            take: size,
            include: this.#includeHerstellerSpez,
        });
        if (pcs.length === 0) {
            this.#logger.debug('#findAll: Keine Komponenten gefunden');
            throw new NotFoundException(`Ungueltige Seite "${number}"`);
        }
        const totalElements = await this.count();
        return this.#createSlice(pcs, totalElements);
    }

    #createSlice(
        pcs: PcMitHerstellerUndSpezifikation[],
        totalElements: number,
    ): Readonly<Slice<PcMitHerstellerUndSpezifikation>> {
        const pcSlice: Slice<PcMitHerstellerUndSpezifikation> = {
            content: pcs,
            totalElements,
        };
        this.#logger.debug('createSlice: pcSlice=%o', pcSlice);
        return pcSlice;
    }

    #checkKeys(keys: string[]) {
        this.#logger.debug('#checkKeys: keys=%o', keys);
        let validKeys = true;
        keys.forEach((key) => {
            if (!suchparameterNamen.includes(key)) {
                this.#logger.debug(
                    '#checkKeys: ungueltiger Suchparameter "%s"',
                    key,
                );
                validKeys = false;
            }
        });
        return validKeys;
    }

    #checkEnums(suchparameter: Suchparameter) {
        const { typ } = suchparameter;
        this.#logger.debug(
            '#checkEnums: Suchparameter "typ=%s"',
            typ ?? 'undefined',
        );
        // Prüft, ob der Typ einer der definierten Enum-Werte ist
        return typ === undefined || Object.values(Komponententyp).includes(typ);
    }
}
