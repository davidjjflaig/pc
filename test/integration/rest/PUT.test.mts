import { HttpStatus } from '@nestjs/common';
import { beforeAll, describe, expect, test } from 'vitest';
import { type PcDtoOhneRef } from '../../../src/pc/controller/pc-dto.js';
import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    IF_MATCH,
    PUT,
    restURL,
} from '../constants.mjs';
import { getToken } from '../token.mjs';

// --- Testdaten ---
const geaenderteKomponente: Omit<PcDtoOhneRef, 'preis'> & { preis: number } = {
    name: 'Intel Core i9-13900K (Updated)',
    typ: 'CPU',
    preis: 750.0,
    herstellerId: 3, // Intel
};
const idVorhanden = '30'; // ID für Core i9-13900K

const geaenderteKomponenteInvalid: Record<string, unknown> = {
    name: '?!',
    typ: 'INVALID',
    preis: -1,
    herstellerId: -1,
};
const idNichtVorhanden = '999999';

// -----------------

describe('PUT /rest/:id', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Vorhandene Komponente aendern', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderteKomponente),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.NO_CONTENT);
    });

    test('Nicht-vorhandene Komponente aendern', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderteKomponente), // Inhalt ist egal
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);
    });

    test('Vorhandene Komponente aendern, aber mit ungueltigen Daten', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);
        const expectedMsg = [
            expect.stringMatching(/^name /u),
            expect.stringMatching(/^typ /u),
            expect.stringMatching(/^preis /u),
        ];

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderteKomponenteInvalid),
            headers,
        });

        // then
        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
        const body = (await response.json()) as { message: string[] };
        expect(body.message).toEqual(expect.arrayContaining(expectedMsg));
    });

    test('Vorhandene Komponente aendern, aber ohne Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderteKomponente),
            headers,
        });

        // then
        expect(response.status).toBe(HttpStatus.PRECONDITION_REQUIRED);
        const body = await response.text();
        expect(body).toBe(`Header "${IF_MATCH}" fehlt`);
    });

    // Weitere Tests (z.B. falscher Token) können übernommen werden
});
