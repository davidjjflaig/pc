/**
 * Das Modul besteht aus der Resolver-Klasse für die GraphQL-Mutationen.
 * @packageDocumentation
 */

// eslint-disable-next-line max-classes-per-file
import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IsInt, IsNumberString, Min } from 'class-validator';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';

import { PcDTO, PcDtoOhneRef } from '../controller/pc-dto.js';
import {
    PcWriteService,
    type PcCreate,
    type PcUpdate,
} from '../service/pc-write-service.js';
import { HttpExceptionFilter } from './http-exception-filter.js';
import { type IdInput } from './pc-query.resolver.js';

/**
 * Typdefinition für das Ergebnis einer `create`-Mutation.
 */
export type CreatePayload = {
    readonly id: number;
};

/**
 * Typdefinition für das Ergebnis einer `update`-Mutation.
 */
export type UpdatePayload = {
    readonly version: number;
};

/**
 * Typdefinition für das Ergebnis einer `delete`-Mutation.
 */
export type DeletePayload = {
    readonly success: boolean;
};

/**
 * DTO-Klasse für GraphQL-Updates, erweitert das Basis-DTO um `id` und `version`.
 */
export class PcUpdateDTO extends PcDtoOhneRef {
    @IsNumberString()
    readonly id!: string;

    @IsInt()
    @Min(0)
    readonly version!: number;
}

/**
 * Die Resolver-Klasse für Schreiboperationen (Mutationen) bei PC-Komponenten.
 */
@Resolver('Pc')
@UseGuards(AuthGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class PcMutationResolver {
    readonly #service: PcWriteService;
    readonly #logger = getLogger(PcMutationResolver.name);

    constructor(service: PcWriteService) {
        this.#service = service;
    }

    /**
     * Eine neue PC-Komponente wird angelegt.
     * @param pcDTO Die Daten der neuen Komponente.
     * @returns Die ID der neu angelegten Komponente.
     */
    @Mutation()
    @Roles('admin', 'user')
    async create(@Args('input') pcDTO: PcDTO) {
        this.#logger.debug('create: pcDTO=%o', pcDTO);

        const pc = this.#pcDtoToPcCreate(pcDTO);
        const id = await this.#service.create(pc);
        this.#logger.debug('createPc: id=%d', id);
        const payload: CreatePayload = { id };
        return payload;
    }

    /**
     * Eine vorhandene PC-Komponente wird aktualisiert.
     * @param pcDTO Die aktualisierten Daten (inkl. ID und Version).
     * @returns Die neue Versionsnummer.
     */
    @Mutation()
    @Roles('admin', 'user')
    async update(@Args('input') pcDTO: PcUpdateDTO) {
        this.#logger.debug('update: pc=%o', pcDTO);

        const pc = this.#pcUpdateDtoToPcUpdate(pcDTO);
        const versionStr = `"${pcDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            id: Number.parseInt(pcDTO.id, 10),
            pc,
            version: versionStr,
        });
        this.#logger.debug('updatePc: versionResult=%d', versionResult);
        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    /**
     * Eine PC-Komponente wird anhand ihrer ID gelöscht.
     * @param id Die ID der zu löschenden Komponente.
     * @returns Ein Erfolgs-Flag.
     */
    @Mutation()
    @Roles('admin')
    async delete(@Args() id: IdInput) {
        const idValue = id.id;
        this.#logger.debug('delete: idValue=%s', idValue);
        await this.#service.delete(Number(idValue));
        const payload: DeletePayload = { success: true };
        return payload;
    }

    /**
     * Konvertiert ein PcDTO-Objekt in ein Prisma PcCreate-Objekt.
     * @param pcDTO Das DTO-Objekt von der GraphQL-Mutation.
     * @returns Das Prisma-Objekt für die `create`-Operation.
     */
    #pcDtoToPcCreate(pcDTO: PcDTO): PcCreate {
        const pc: PcCreate = {
            version: 0,
            name: pcDTO.name,
            typ: pcDTO.typ,
            preis: pcDTO.preis.toNumber(),
            hersteller: {
                connect: { id: pcDTO.herstellerId },
            },
            spezifikation: {
                create: {
                    kerntaktMhz: pcDTO.spezifikation.kerntaktMhz ?? null,
                    speicherGb: pcDTO.spezifikation.speicherGb ?? null,
                    leserateMbps: pcDTO.spezifikation.leserateMbps ?? null,
                },
            },
        };
        return pc;
    }

    /**
     * Konvertiert ein PcUpdateDTO-Objekt in ein Prisma PcUpdate-Objekt.
     * @param pcDTO Das DTO-Objekt von der GraphQL-Mutation.
     * @returns Das Prisma-Objekt für die `update`-Operation.
     */
    #pcUpdateDtoToPcUpdate(pcDTO: PcUpdateDTO): PcUpdate {
        return {
            name: pcDTO.name,
            typ: pcDTO.typ,
            preis: pcDTO.preis.toNumber(),
            hersteller: {
                connect: { id: Number(pcDTO.herstellerId) },
            },
        };
    }
}
