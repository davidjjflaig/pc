/**
 * Das Modul besteht aus der Controller-Klasse für Schreiben an der REST-Schnittstelle.
 * @packageDocumentation
 */

/* eslint-disable max-lines */
import {
    Body,
    Controller,
    Delete,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiHeader,
    ApiNoContentResponse,
    ApiOperation,
    ApiPreconditionFailedResponse,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';

import {
    type PcCreate,
    type PcUpdate,
    PcWriteService,
} from '../service/pc-write-service.js';

import { createBaseUri } from './create-base-uri.js';
import { PcDTO, PcDtoOhneRef } from './pc-dto.js';

const MSG_FORBIDDEN = 'Kein Token mit ausreichender Berechtigung vorhanden';

/**
 * Die Controller-Klasse für die Verwaltung von PC-Komponenten (Schreiboperationen).
 */
@Controller(paths.rest)
@UseGuards(AuthGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('PC-Komponenten REST-API')
@ApiBearerAuth()
export class PcWriteController {
    readonly #service: PcWriteService;
    readonly #logger = getLogger(PcWriteController.name);

    constructor(service: PcWriteService) {
        this.#service = service;
    }

    /**
     * Eine neue Komponente wird asynchron angelegt.
     * @param pcDTO JSON-Daten für eine Komponente im Request-Body.
     * @param req Request-Objekt von Express für den Location-Header.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Post()
    @Roles('admin', 'user')
    @ApiOperation({ summary: 'Eine neue Komponente anlegen' })
    @ApiCreatedResponse({ description: 'Erfolgreich neu angelegt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Komponentendaten' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async post(
        @Body() pcDTO: PcDTO,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('post: pcDTO=%o', pcDTO);

        const pc = this.#pcDtoToPcCreateInput(pcDTO);
        const id = await this.#service.create(pc);

        const location = `${createBaseUri(req)}/${id}`;
        this.#logger.debug('post: location=%s', location);
        return res.location(location).send();
    }

    /**
     * Eine vorhandene Komponente wird asynchron aktualisiert.
     * @param pcDTO Komponentendaten im Body des Request-Objekts.
     * @param id Pfad-Paramater für die ID.
     * @param version Versionsnummer aus dem Header _If-Match_.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Put(':id')
    @Roles('admin', 'user')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eine vorhandene Komponente aktualisieren' })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header für optimistische Synchronisation',
        required: false,
    })
    @ApiNoContentResponse({ description: 'Erfolgreich aktualisiert' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Komponentendaten' })
    @ApiPreconditionFailedResponse({
        description: 'Falsche Version im Header "If-Match"',
    })
    @ApiResponse({
        status: HttpStatus.PRECONDITION_REQUIRED,
        description: 'Header "If-Match" fehlt',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async put(
        @Body() pcDTO: PcDtoOhneRef,
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'put: id=%d, pcDTO=%o, version=%s',
            id,
            pcDTO,
            version ?? 'undefined',
        );

        if (version === undefined) {
            const msg = 'Header "If-Match" fehlt';
            this.#logger.debug('put: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'application/json')
                .send(msg);
        }

        const pc = this.#pcDtoToPcUpdate(pcDTO);
        const neueVersion = await this.#service.update({ id, pc, version });
        this.#logger.debug('put: version=%d', neueVersion);
        return res.header('ETag', `"${neueVersion}"`).send();
    }

    /**
     * Eine Komponente wird anhand ihrer ID gelöscht.
     * @param id Pfad-Paramater für die ID.
     * @returns Leeres Promise-Objekt.
     */
    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Komponente mit der ID löschen' })
    @ApiNoContentResponse({
        description: 'Die Komponente wurde gelöscht oder war nicht vorhanden',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async delete(@Param('id') id: number) {
        this.#logger.debug('delete: id=%d', id);
        await this.#service.delete(id);
    }

    /**
     * Konvertiert ein PcDTO-Objekt in ein Prisma PcCreate-Objekt.
     * @param dto Das DTO-Objekt aus dem Request-Body.
     * @returns Das Prisma-Objekt für die `create`-Operation.
     */
    #pcDtoToPcCreateInput(dto: PcDTO): PcCreate {
        const pc: PcCreate = {
            version: 0,
            name: dto.name,
            typ: dto.typ,
            preis: dto.preis.toNumber(),
            hersteller: {
                connect: { id: dto.herstellerId },
            },
            spezifikation: {
                create: {
                    kerntaktMhz: dto.spezifikation.kerntaktMhz ?? null,
                    speicherGb: dto.spezifikation.speicherGb ?? null,
                    leserateMbps: dto.spezifikation.leserateMbps ?? null,
                },
            },
        };
        return pc;
    }

    /**
     * Konvertiert ein PcDtoOhneRef-Objekt in ein Prisma PcUpdate-Objekt.
     * @param dto Das DTO-Objekt aus dem Request-Body.
     * @returns Das Prisma-Objekt für die `update`-Operation.
     */
    #pcDtoToPcUpdate(dto: PcDtoOhneRef): PcUpdate {
        return {
            version: 0, // Wird vom Service (Interceptor) gesetzt
            name: dto.name,
            typ: dto.typ,
            preis: dto.preis.toNumber(),
            hersteller: {
                connect: { id: dto.herstellerId },
            },
            // Spezifikation wird bei PUT (vereinfacht) nicht aktualisiert
        };
    }
}
/* eslint-enable max-lines */
