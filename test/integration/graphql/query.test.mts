/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { type GraphQLRequest } from '@apollo/server';
import { HttpStatus } from '@nestjs/common';
import { beforeAll, describe, expect, test } from 'vitest';
import {
    Komponententyp,
    type Prisma,
} from '../../../src/generated/prisma/client.js';
import {
    ACCEPT,
    APPLICATION_JSON,
    CONTENT_TYPE,
    GRAPHQL_RESPONSE_JSON,
    POST,
    graphqlURL,
} from '../constants.mjs';

/**
 * DTO-Typ für eine *vollständige* Komponente (wird im "findById"-Test verwendet).
 * Beinhaltet Hersteller- und Spezifikationsdetails.
 */
export type PcDTO = Prisma.KomponenteGetPayload<{
    include: {
        hersteller: true;
        spezifikation: true;
    };
}>;

/**
 * DTO-Typ für die *Such-Abfrage*, die nur Name und Hersteller zurückgibt.
 */
export type PcNameHerstellerDTO = Pick<PcDTO, 'name' | 'hersteller'>;

/**
 * Generische Typen für GraphQL-Antworten
 */

/**
 * Typ für eine erfolgreiche GraphQL-Antwort beim Abrufen einer einzelnen Komponente.
 */
type PcSuccessType = { data: { pc: PcDTO }; errors?: undefined };

/**
 * Typ für eine erfolgreiche GraphQL-Antwort beim Abrufen mehrerer Komponenten (nur Name und Hersteller).
 */
type PcsSuccessType = {
    data: { pcs: PcNameHerstellerDTO[] };
    errors?: undefined;
};

/**
 * Definiert die Struktur eines GraphQL-Fehlers.
 */
export type ErrorsType = {
    message: string;
    path: string[];
    extensions: { code: string };
}[];

/**
 * Typ für eine fehlerhafte GraphQL-Antwort beim Abrufen einer einzelnen Komponente.
 */
type PcErrorsType = { data: { pc: null }; errors: ErrorsType };

/**
 * Typ für eine fehlerhafte GraphQL-Antwort beim Abrufen mehrerer Komponenten.
 */
type PcsErrorsType = { data: { pcs: null }; errors: ErrorsType };

/**
 * Testdaten
 */
/** IDs für existierende Komponenten. */
const ids = [10, 20];
/** Teil-Namen für die Suche. */
const nameArray = ['GeForce', 'Ryzen'];
/** Nicht existierende Teil-Namen für die Suche. */
const nameNichtVorhanden = ['xxx', 'yyy', 'zzz'];
/** Ein spezifischer Komponententyp für die Suche. */
const typCpu: Komponententyp = 'CPU';

describe('GraphQL Queries (PC)', () => {
    let headers: Headers;

    beforeAll(() => {
        headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
    });

    /**
     * Testet die Abfrage einer einzelnen Komponente anhand ihrer ID.
     * Erwartet eine vollständige Komponente (PcDTO).
     */
    test.concurrent.each(ids)('Komponente zu ID %i', async (id) => {
        // given
        const query: GraphQLRequest = {
            query: `
                {
                    pc(id: "${id}") {
                        version
                        name
                        typ
                        preis
                        hersteller { name, gruendungsjahr }
                        spezifikation { kerntaktMhz, speicherGb, leserateMbps }
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        const { status } = response;
        expect(status).toBe(HttpStatus.OK);
        const { data, errors } = (await response.json()) as PcSuccessType;

        expect(errors).toBeUndefined();
        expect(data).toBeDefined();

        const { pc } = data;
        expect(pc.name).toBeDefined();
        expect(pc.version).toBeGreaterThanOrEqual(0);
        expect(pc.hersteller.name).toBeDefined();
    });

    /**
     * Testet die Abfrage einer Komponente mit einer nicht existierenden ID.
     * Erwartet einen GraphQL-Fehler.
     */
    test.concurrent('Komponente zu nicht-vorhandener ID', async () => {
        const id = '999999';
        const query: GraphQLRequest = {
            query: `
                {
                    pc(id: "${id}") {
                        name
                    }
                }
            `,
        };
        const response = await fetch(graphqlURL, {
            headers,
            method: POST,
            body: JSON.stringify(query),
        });
        const { data, errors } = (await response.json()) as PcErrorsType;
        expect(data.pc).toBeNull();
        expect(errors).toHaveLength(1);
        expect(errors[0]!.message).toBe(
            `Es gibt keine Komponente mit der ID ${id}.`,
        );
    });

    /**
     * Testet die Suche nach Komponenten anhand eines Teil-Namens.
     * Erwartet ein Array von Komponenten (PcNameHerstellerDTO).
     */
    test.concurrent.each(nameArray)(
        'Komponenten zu Teil-Name %s',
        async (name) => {
            // given
            const query: GraphQLRequest = {
                query: `
                    {
                        pcs(suchparameter: {
                            name: "${name}"
                        }) {
                            name
                            hersteller {
                                name
                            }
                        }
                    }
                `,
            };

            // when
            const response = await fetch(graphqlURL, {
                method: POST,
                body: JSON.stringify(query),
                headers,
            });

            // then
            const { status } = response;
            expect(status).toBe(HttpStatus.OK);
            const { data, errors } = (await response.json()) as PcsSuccessType;

            expect(errors).toBeUndefined();
            expect(data).toBeDefined();

            const { pcs } = data;
            expect(pcs).not.toHaveLength(0);

            pcs.forEach((pc) => {
                expect(pc.name.toLowerCase()).toEqual(
                    expect.stringContaining(name.toLowerCase()),
                );
            });
        },
    );

    /**
     * Testet die Suche nach Komponenten mit einem nicht existierenden Teil-Namen.
     * Erwartet einen GraphQL-Fehler.
     */
    test.concurrent.each(nameNichtVorhanden)(
        'Komponente zu nicht vorhandenem Namen %s',
        async (name) => {
            const query: GraphQLRequest = {
                query: `
                    {
                        pcs(suchparameter: {
                            name: "${name}"
                        }) {
                            name
                        }
                    }
                `,
            };
            const response = await fetch(graphqlURL, {
                headers,
                method: POST,
                body: JSON.stringify(query),
            });
            const { data, errors } = (await response.json()) as PcsErrorsType;
            expect(data.pcs).toBeNull();
            expect(errors).toHaveLength(1);
            expect(errors[0]!.message).toMatch(/^Keine Komponenten gefunden:/u);
        },
    );

    /**
     * Testet die Suche nach Komponenten anhand des Typs 'CPU'.
     * Erwartet ein Array von Komponenten mit 'typ' und 'name'.
     */
    test.concurrent('Komponenten zum Typ "CPU"', async () => {
        // given
        const typ: Komponententyp = 'CPU';
        const query: GraphQLRequest = {
            query: `
                {
                    pcs(suchparameter: {
                        typ: ${typCpu}
                    }) {
                        typ
                        name
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        const { status } = response;
        expect(status).toBe(HttpStatus.OK);

        const { data, errors } = (await response.json()) as {
            data: { pcs: { typ: Komponententyp; name: string }[] };
            errors?: undefined;
        };

        expect(errors).toBeUndefined();
        expect(data).toBeDefined();

        const { pcs } = data;
        expect(pcs).not.toHaveLength(0);

        pcs.forEach((pc) => {
            expect(pc.typ).toBe(typ);
            expect(pc.name).toBeDefined();
        });
    });
});
/* eslint-enable @typescript-eslint/no-non-null-assertion */
