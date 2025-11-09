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

/**
 * Testdaten
 */

/**
 * Ein gültiges DTO (Data Transfer Object) zum Ändern einer Komponente.
 * (Core i9-13900K wird aktualisiert)
 */
const geaenderteKomponente: Omit<PcDtoOhneRef, 'preis'> & { preis: number } = {
    name: 'Intel Core i9-13900K (Updated)',
    typ: 'CPU',
    preis: 750.0,
    herstellerId: 3, // Intel
};
/** ID einer existierenden Komponente (Core i9-13900K). */
const idVorhanden = '30';

/**
 * Ein ungültiges Objekt, das zum Testen der Validierungsregeln
 * beim Aktualisieren verwendet wird.
 */
const geaenderteKomponenteInvalid: Record<string, unknown> = {
    name: '?!',
    typ: 'INVALID',
    preis: -1,
    herstellerId: -1,
};
/** ID einer nicht-existierenden Komponente. */
const idNichtVorhanden = '999999';

/**
 * Testet die PUT-Anfragen für /rest/:id (Aktualisieren einer Komponente).
 */
describe('PUT /rest/:id', () => {
    let token: string;

    /**
     * Holt den Admin-Token vor der Ausführung der Tests.
     */
    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    /**
     * Testet die erfolgreiche Aktualisierung einer existierenden Komponente.
     * Erwartet HttpStatus.NO_CONTENT.
     */
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

    /**
     * Testet die Aktualisierung einer Komponente mit einer nicht-existierenden ID.
     * Erwartet HttpStatus.NOT_FOUND.
     */
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

    /**
     * Testet die Aktualisierung mit ungültigen Validierungsdaten.
     * Erwartet HttpStatus.BAD_REQUEST und ein Array von Fehlermeldungen.
     */
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

        // eslint-disable-next-line vitest/prefer-strict-equal
        expect(body.message).toEqual(expect.arrayContaining(expectedMsg));
    });

    /**
     * Testet die Aktualisierung ohne den erforderlichen 'If-Match'-Header (Version).
     * Erwartet HttpStatus.PRECONDITION_REQUIRED.
     */
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
});
