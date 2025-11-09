import { HttpStatus } from '@nestjs/common';
import { beforeAll, describe, expect, test } from 'vitest';
// Importiere deine DTOs
import { type PcDTO } from '../../../src/pc/controller/pc-dto.js';
import { PcService } from '../../../src/pc/service/pc-service.js';
import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    LOCATION,
    POST,
    restURL,
} from '../constants.mjs';
import { getToken } from '../token.mjs';

/**
 * Testdaten
 */

/**
 * Ein gültiges DTO (Data Transfer Object) für eine neue Komponente,
 * die in den Tests erstellt werden soll.
 */
const neueKomponente: Omit<PcDTO, 'preis'> & { preis: number } = {
    name: 'Ryzen 5 7600X',
    typ: 'CPU',
    preis: 249.99,
    herstellerId: 2, // ID für AMD
    spezifikation: {
        kerntaktMhz: 4700,
        speicherGb: undefined,
        leserateMbps: undefined,
    },
};

/**
 * Ein ungültiges Objekt, das zum Testen der Validierungsregeln
 * beim Erstellen einer neuen Komponente verwendet wird.
 */
const neueKomponenteInvalid: Record<string, unknown> = {
    name: '?!',
    typ: 'INVALID_TYP',
    preis: -1,
    herstellerId: -1,
    spezifikation: {},
};

/**
 * Definiert die erwartete Struktur einer Fehlermeldung (z. B. bei Validierungsfehlern).
 */
type MessageType = { message: string | string[] };

/**
 * Testet die POST-Anfragen für /rest (Erstellen neuer Komponenten).
 */
describe('POST /rest', () => {
    let token: string;

    /**
     * Holt den Admin-Token vor der Ausführung der Tests.
     */
    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    /**
     * Testet das erfolgreiche Erstellen einer neuen Komponente.
     * Erwartet HttpStatus.CREATED und einen 'Location'-Header mit der neuen ID.
     */
    test('Neue Komponente', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neueKomponente),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.CREATED);

        const responseHeaders = response.headers;
        const location = responseHeaders.get(LOCATION);

        expect(location).toBeDefined();

        const indexLastSlash = location?.lastIndexOf('/') ?? -1;

        expect(indexLastSlash).not.toBe(-1);

        const idStr = location?.slice(indexLastSlash + 1);

        expect(idStr).toBeDefined();
        // Prüft, ob die zurückgegebene ID eine gültige Zahl ist
        expect(PcService.ID_PATTERN.test(idStr ?? '')).toBe(true);
    });

    /**
     * Testet das Erstellen einer Komponente mit ungültigen Daten.
     * Erwartet HttpStatus.BAD_REQUEST und ein Array von Fehlermeldungen.
     */
    test.concurrent('Neue Komponente mit ungueltigen Daten', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        const expectedMsg = [
            expect.stringMatching(/^name /u),
            expect.stringMatching(/^typ /u),
            expect.stringMatching(/^preis /u),
            expect.stringMatching(/^herstellerId /u),
        ];

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neueKomponenteInvalid),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.BAD_REQUEST);

        const body = (await response.json()) as MessageType;
        const messages = body.message;

        expect(messages).toBeDefined();
        // eslint-disable-next-line vitest/prefer-strict-equal
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });

    /**
     * Testet das Erstellen einer Komponente ohne Authentifizierungs-Token.
     * Erwartet HttpStatus.UNAUTHORIZED.
     */
    test.concurrent('Neue Komponente, aber ohne Token', async () => {
        // when
        const { status } = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neueKomponente),
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });

    /**
     * Testet das Erstellen einer Komponente mit einem ungültigen Token.
     * Erwartet HttpStatus.UNAUTHORIZED.
     */
    test.concurrent('Neue Komponente, aber mit falschem Token', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neueKomponente),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });
});
