/**
 * Das Modul besteht aus der Resolver-Klasse für die GraphQL-Queries.
 * @packageDocumentation
 */

import { UseFilters, UseInterceptors } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Public } from 'nest-keycloak-connect';
import { Komponententyp } from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';

import {
    PcService,
    type PcMitHerstellerUndSpezifikation,
} from '../service/pc-service.js';

import { createPageable } from '../service/pageable.js';
import { Slice } from '../service/slice.js';
import { Suchparameter } from '../service/suchparameter.js';
import { HttpExceptionFilter } from './http-exception-filter.js';

/** Typdefinition für die GraphQL-Input-Variable `id`. */
export type IdInput = {
    readonly id: string;
};

/** Typdefinition für die GraphQL-Input-Variable `suchparameter`. */
export type SuchparameterInput = {
    readonly suchparameter: {
        name?: string;
        typ?: Komponententyp;
    };
};

/**
 * Die Resolver-Klasse für Leseoperationen (Queries) bei PC-Komponenten.
 */
@Resolver('Pc')
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class PcQueryResolver {
    readonly #service: PcService;
    readonly #logger = getLogger(PcQueryResolver.name);

    constructor(service: PcService) {
        this.#service = service;
    }

    /**
     * Eine PC-Komponente wird anhand ihrer ID gesucht.
     * @param id Die ID der zu suchenden Komponente.
     * @returns Die gefundene Komponente.
     */
    @Query('pc')
    @Public()
    async findById(
        @Args() { id }: IdInput,
    ): Promise<Readonly<PcMitHerstellerUndSpezifikation>> {
        this.#logger.debug('findById: id=%s', id);

        const pc: Readonly<PcMitHerstellerUndSpezifikation> =
            await this.#service.findById({ id: Number(id) });

        this.#logger.debug('findById: pc=%o', pc);
        return pc;
    }

    /**
     * PC-Komponenten werden anhand von Suchkriterien gesucht.
     * @param input Die Suchkriterien.
     * @returns Ein Array der gefundenen Komponenten.
     */
    @Query('pcs')
    @Public()
    async find(
        @Args() input: SuchparameterInput | undefined,
    ): Promise<PcMitHerstellerUndSpezifikation[]> {
        this.#logger.debug('find: input=%s', JSON.stringify(input));
        const pageable = createPageable({});
        const suchparameter = input?.suchparameter;

        const pcSlice: Readonly<
            Slice<Readonly<PcMitHerstellerUndSpezifikation>>
        > = await this.#service.find(suchparameter as Suchparameter, pageable);
        this.#logger.debug('find: pcSlice=%o', pcSlice);
        return pcSlice.content;
    }
}
