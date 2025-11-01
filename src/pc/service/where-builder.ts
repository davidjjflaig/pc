/**
 * Das Modul besteht aus der Klasse {@linkcode WhereBuilder}.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { type Komponententyp, Prisma } from '../../generated/prisma/client.js';
import { type KomponenteWhereInput } from '../../generated/prisma/models/Komponente.js';
import { getLogger } from '../../logger/logger.js';
import { type Suchparameter } from './suchparameter.js';

/**
 * Die Klasse `WhereBuilder` baut die WHERE-Klausel für DB-Anfragen mit _Prisma_.
 */
@Injectable()
export class WhereBuilder {
    readonly #logger = getLogger(WhereBuilder.name);

    /**
     * Baut die WHERE-Klausel für die flexible Suche nach Komponenten.
     * @param suchparameter JSON-Objekt mit Suchparametern.
     * @returns Ein `KomponenteWhereInput`-Objekt für Prisma.
     */
    build(suchparameter: Suchparameter) {
        this.#logger.debug('build: suchparameter=%o', suchparameter);

        const where: KomponenteWhereInput = {};

        Object.entries(suchparameter).forEach(([key, value]) => {
            switch (key) {
                case 'name':
                    where.name = {
                        contains: value as string,
                        mode: Prisma.QueryMode.insensitive,
                    };
                    break;
                case 'typ':
                    where.typ = { equals: value as Komponententyp };
                    break;
            }
        });

        this.#logger.debug('build: where=%o', where);
        return where;
    }
}
