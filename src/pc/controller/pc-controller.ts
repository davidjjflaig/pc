/**
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

// eslint-disable-next-line max-classes-per-file
import {
    Controller,
    Get,
    Headers,
    HttpStatus,
    NotFoundException,
    Param,
    ParseIntPipe,
    Query,
    Req,
    Res,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProperty,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { Komponententyp } from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';

import {
    type PcMitHerstellerUndSpezifikation,
    PcService,
} from '../service/pc-service.js';

import { createPageable } from '../service/pageable.js';
import { type Suchparameter } from '../service/suchparameter.js';
import { createPage, Page } from './page.js';

/**
 * Klasse für Such-Queries in OpenAPI / Swagger.
 */
export class PcQuery implements Suchparameter {
    @ApiProperty({ required: false })
    declare readonly name?: string;

    @ApiProperty({ required: false })
    declare readonly typ?: Komponententyp;

    @ApiProperty({ required: false })
    declare size?: string;
    @ApiProperty({ required: false })
    declare page?: string;
    @ApiProperty({ required: false })
    declare only?: 'count';
}

export type CountResult = Record<'count', number>;

@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('PC-Komponenten REST-API')
export class PcController {
    readonly #service: PcService;
    readonly #logger = getLogger(PcController.name);

    constructor(service: PcService) {
        this.#service = service;
    }

    /**
     * Eine Komponente wird asynchron anhand ihrer ID gesucht.
     */
    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Suche mit der Komponenten-ID' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 10',
    })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header für bedingte GET-Requests, z.B. "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'Komponente wurde gefunden' })
    @ApiNotFoundResponse({ description: 'Keine Komponente zur ID gefunden' })
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'Die Komponente wurde bereits heruntergeladen',
    })
    async getById(
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response<PcMitHerstellerUndSpezifikation>> {
        this.#logger.debug('getById: id=%d, version=%s', id, version ?? '-1');

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('getById: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const pc = await this.#service.findById({ id });
        if (pc === undefined) {
            throw new NotFoundException(
                `Keine Komponente mit der ID ${id} gefunden.`,
            );
        }
        this.#logger.debug('getById(): pc=%o', pc);

        // ETags
        const versionDb = pc.version;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('getById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        this.#logger.debug('getById: versionDb=%d', versionDb ?? -1);
        res.header('ETag', `"${versionDb}"`);

        return res.json(pc);
    }

    /**
     * Komponenten werden mit Query-Parametern asynchron gesucht.
     */
    @Get()
    @Public()
    @ApiOperation({ summary: 'Suche mit Suchparametern' })
    @ApiOkResponse({ description: 'Eine evtl. leere Liste mit Komponenten' })
    async get(
        @Query() query: PcQuery,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<
        Response<Page<Readonly<PcMitHerstellerUndSpezifikation>> | CountResult>
    > {
        this.#logger.debug('get: query=%o', query);

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('get: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const { only } = query;
        if (only !== undefined) {
            const count = await this.#service.count();
            this.#logger.debug('get: count=%d', count);
            return res.json({ count: count });
        }

        const { page, size } = query;
        delete query['page'];
        delete query['size'];
        const keys = Object.keys(query) as (keyof PcQuery)[];
        keys.forEach((key) => {
            if (query[key] === undefined) {
                delete query[key];
            }
        });
        this.#logger.debug('get: query=%o', query);

        const pageable = createPageable({ number: page, size });
        const pcSlice = await this.#service.find(query, pageable);
        const pcPage = createPage(pcSlice, pageable);
        this.#logger.debug('get: pcPage=%o', pcPage);

        return res.json(pcPage).send();
    }
}
