import { HttpStatus } from '@nestjs/common';
import { beforeAll, describe, expect, test } from 'vitest';
import {
    ACCEPT,
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    GRAPHQL_RESPONSE_JSON,
    POST,
    graphqlURL,
} from '../constants.mjs';
import { type GraphQLQuery } from './graphql.mjs';
import { ErrorsType } from './query.test.mjs';
import { getToken } from './token.mjs';

/**
 * Testdaten
 */
/** ID für RAM, das wir löschen */
const idLoeschen = '40';
/** ID für Samsung SSD, die wir aktualisieren */
const idUpdate = '50';

/**
 * Typdefinitionen für GraphQL-Antworten
 */
type CreateSuccessType = {
    data: { create: { id: string } };
    errors?: undefined;
};
type CreateErrorsType = { data: { create: null }; errors: ErrorsType };
type UpdateSuccessType = {
    data: { update: { version: number } };
    errors?: undefined;
};
type UpdateErrorsType = { data: { update: null }; errors: ErrorsType };
type DeleteSuccessType = {
    data: { delete: { success: boolean } };
    errors?: undefined;
};
type DeleteErrorsType = { data: { delete: null }; errors: ErrorsType };

describe('GraphQL Mutations (PC)', () => {
    let token: string;
    let tokenUser: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
        tokenUser = await getToken('user', 'p');
    });

    test('Neue Komponente', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            name: "Ryzen 5 7600X",
                            typ: CPU,
                            preis: 249.99,
                            herstellerId: 2,
                            spezifikation: {
                                kerntaktMhz: 4700
                            }
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;
        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data } = (await response.json()) as CreateSuccessType;
        expect(data).toBeDefined();

        const { create } = data;
        expect(create).toBeDefined();
        expect(parseInt(create.id, 10)).toBeGreaterThan(0);
    });

    test('Komponente mit ungueltigen Werten neu anlegen', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            name: "?!",
                            typ: CPU,
                            preis: -1,
                            herstellerId: -1,
                            spezifikation: {}
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const expectedMsg = [
            expect.stringMatching(/^name /u),
            expect.stringMatching(/^preis /u),
            expect.stringMatching(/^herstellerId /u),
            expect.stringMatching(/^spezifikation /u),
        ];
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;
        expect(status).toBe(HttpStatus.OK);
        const { data, errors } = (await response.json()) as CreateErrorsType;

        expect(data.create).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors;
        expect(error).toBeDefined();
        const { message } = error!;
        const messages: string[] = message.split(',');

        expect(messages).toBeDefined();
        expect(messages.length).toBeGreaterThanOrEqual(expectedMsg.length);
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });

    test('Komponente aktualisieren', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${idUpdate}",
                            version: 0,
                            name: "Samsung 990 Pro 2TB (Updated)",
                            typ: SSD,
                            preis: 169.99,
                            herstellerId: 5
                        }
                    ) {
                        version
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;
        expect(status).toBe(HttpStatus.OK);

        const { data, errors } = (await response.json()) as UpdateSuccessType;
        expect(errors).toBeUndefined();

        const { update } = data;
        expect(update.version).toBeGreaterThanOrEqual(1);
    });

    test('Nicht-vorhandene Komponente aktualisieren', async () => {
        // given
        const id = '999999';
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${id}",
                            version: 0,
                            name: "Test",
                            typ: CPU,
                            preis: 1.00,
                            herstellerId: 1
                        }
                    ) {
                        version
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;
        expect(status).toBe(HttpStatus.OK);
        const { data, errors } = (await response.json()) as UpdateErrorsType;

        expect(data.update).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error!;

        expect(message).toBe(`Es gibt keine Komponente mit der ID ${id}.`);
        expect(path![0]).toBe('update');
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Komponente loeschen', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "${idLoeschen}") {
                        success
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;
        expect(status).toBe(HttpStatus.OK);

        const { data, errors } = (await response.json()) as DeleteSuccessType;
        expect(errors).toBeUndefined();
        expect(data.delete.success).toBe(true);
    });

    test('Komponente loeschen als "user"', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "10") {
                        success
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${tokenUser}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;
        expect(status).toBe(HttpStatus.OK);

        const { data, errors } = (await response.json()) as DeleteErrorsType;

        expect(data.delete).toBeNull();
        expect(errors).toBeDefined();

        const [error] = errors!;
        expect(error).toBeDefined();

        const { message, extensions } = error!;
        expect(message).toBe('Forbidden resource');
        expect(extensions.code).toBe('BAD_USER_INPUT');
    });
});
