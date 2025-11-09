import { HttpStatus } from '@nestjs/common';
import { beforeAll, describe, expect, test } from 'vitest';
import { AUTHORIZATION, BEARER, DELETE, restURL } from '../constants.mjs';
import { getToken } from '../token.mjs';

/**
 * Testdaten
 */
/** ID der zu löschenden Komponente (Samsung SSD). */
const id = '50';

describe('DELETE /rest', () => {
    let token: string;
    let tokenUser: string;

    /**
     * Holt die Tokens für 'admin' und 'user' vor allen Tests.
     */
    beforeAll(async () => {
        token = await getToken('admin', 'p');
        tokenUser = await getToken('user', 'p');
    });

    /**
     * Testet das erfolgreiche Löschen einer Komponente mit Admin-Rechten.
     */
    test.concurrent('Vorhandene Komponente loeschen', async () => {
        // given
        const url = `${restURL}/${id}`;
        const headers = new Headers();
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: DELETE,
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.NO_CONTENT);
    });

    /**
     * Testet das Löschen einer Komponente ohne Authentifizierungs-Token.
     * Erwartet HttpStatus.UNAUTHORIZED.
     */
    test.concurrent('Komponente loeschen, aber ohne Token', async () => {
        // given
        const url = `${restURL}/${id}`;

        // when
        const { status } = await fetch(url, { method: DELETE });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });

    /**
     * Testet das Löschen einer Komponente mit einem ungültigen Token.
     * Erwartet HttpStatus.UNAUTHORIZED.
     */
    test.concurrent(
        'Komponente loeschen, aber mit falschem Token',
        async () => {
            // given
            const url = `${restURL}/${id}`;
            const headers = new Headers();
            headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

            // when
            const { status } = await fetch(url, {
                method: DELETE,
                headers,
            });

            // then
            expect(status).toBe(HttpStatus.UNAUTHORIZED);
        },
    );

    /**
     * Testet das Löschen einer Komponente mit 'user'-Rechten.
     * Erwartet HttpStatus.FORBIDDEN, da nur Admins löschen dürfen.
     */
    test.concurrent('Vorhandene Komponente als "user" loeschen', async () => {
        // given
        const url = `${restURL}/10`;
        const headers = new Headers();
        headers.append(AUTHORIZATION, `${BEARER} ${tokenUser}`);

        // when
        const { status } = await fetch(url, {
            method: DELETE,
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.FORBIDDEN);
    });
});
