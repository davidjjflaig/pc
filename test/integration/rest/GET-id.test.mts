import { HttpStatus } from '@nestjs/common';
import { describe, expect, test } from 'vitest';
import { CONTENT_TYPE, IF_NONE_MATCH, restURL } from '../constants.mjs';

/**
 * Testdaten
 */
/** IDs für existierende PC-Komponenten. */
const ids = [10, 20];
/** ID einer nicht existierenden Komponente. */
const idNichtVorhanden = 999999;
/** IDs für den ETag-Test (If-None-Match). */
const idsETag = [10, 20];
/** Eine syntaktisch ungültige ID (keine Zahl). */
const idFalsch = 'xy';

/**
 * Testet die GET-Anfragen für /rest/:id (Abruf einer einzelnen Komponente).
 */
describe('GET /rest/:id', () => {
    /**
     * Testet die erfolgreiche Abfrage einer Komponente anhand einer existierenden ID.
     * Erwartet HttpStatus.OK und die korrekten Daten.
     * @param id Die zu testende ID.
     */
    test.concurrent.each(ids)('Komponente zu vorhandener ID %i', async (id) => {
        // given
        const url = `${restURL}/${id}`;

        // when
        const response = await fetch(url);
        const { status, headers } = response;

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

        const body = (await response.json()) as { id: number };

        expect(body.id).toBe(id);
    });

    /**
     * Testet die Abfrage einer Komponente mit einer numerischen, aber nicht existierenden ID.
     * Erwartet HttpStatus.NOT_FOUND.
     */
    test.concurrent('Keine Komponente zu nicht-vorhandener ID', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}`;

        // when
        const { status } = await fetch(url);

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);
    });

    /**
     * Testet die Abfrage mit einer ungültigen (nicht-numerischen) ID.
     * Erwartet HttpStatus.NOT_FOUND.
     */
    test.concurrent('Keine Komponente zu falscher ID', async () => {
        // given
        const url = `${restURL}/${idFalsch}`;

        // when
        const { status } = await fetch(url);

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);
    });

    /**
     * Testet den ETag-Mechanismus (If-None-Match).
     * Sendet ein ETag "0" und erwartet HttpStatus.NOT_MODIFIED,
     * da die Ressource eine andere Version (neuer als "0") hat.
     * @param id Die zu testende ID.
     */
    test.concurrent.each(idsETag)(
        'Komponente zu ID %i mit If-None-Match',
        async (id) => {
            // given
            const url = `${restURL}/${id}`;
            const headers = new Headers();
            headers.append(IF_NONE_MATCH, '"0"');

            // when
            const response = await fetch(url, { headers });
            const { status } = response;

            // then
            expect(status).toBe(HttpStatus.NOT_MODIFIED);

            const body = await response.text();

            expect(body).toBe('');
        },
    );
});
