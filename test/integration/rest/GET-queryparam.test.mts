// Copyright (C) 2024 DEIN NAME, Hochschule Karlsruhe
// Angepasst von der Vorlage von Juergen Zimmermann

import { HttpStatus } from '@nestjs/common';
import { describe, expect, test } from 'vitest';
import {
    type Komponente,
    type Komponententyp,
} from '../../../src/generated/prisma/client.js';
import { type Page } from '../../../src/pc/controller/page.js';
import { CONTENT_TYPE, restURL } from '../constants.mjs';

/**
 * Testdaten
 */
/** Teil-Namen für die Suche nach existierenden Komponenten. */
const nameArray = ['GeForce', 'Ryzen'];
/** Teil-Namen für die Suche, die keine Ergebnisse liefern sollen. */
const nameNichtVorhanden = ['xxx', 'yyy', 'zzz'];
/** Komponententypen für die Suche. */
const typen: Komponententyp[] = ['CPU', 'GPU'];

/**
 * Testet die GET-Anfragen für /rest (Suche und Abruf mehrerer Komponenten).
 */
describe('GET /rest', () => {
    /**
     * Testet die Abfrage aller Komponenten ohne Suchfilter.
     * Erwartet HttpStatus.OK und eine Paginierungsstruktur (Page).
     */
    test.concurrent('Alle Komponenten', async () => {
        // given

        // when
        const response = await fetch(restURL);
        const { status, headers } = response;

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

        const body = (await response.json()) as Page<Komponente>;

        expect(body).toBeDefined();
        body.content
            .map((pc: Komponente) => pc.id)
            .forEach((id) => {
                expect(id).toBeDefined();
            });
    });

    /**
     * Testet die Suche nach Komponenten anhand eines Teil-Namens.
     * Erwartet HttpStatus.OK und nur Komponenten, die den Suchbegriff im Namen tragen.
     * @param name Der zu suchende Teil-Name.
     */
    test.concurrent.each(nameArray)(
        'Komponenten mit Teil-Name %s suchen',
        async (name) => {
            // given
            const params = new URLSearchParams({ name });
            const url = `${restURL}?${params}`;

            // when
            const response = await fetch(url);
            const { status, headers } = response;

            // then
            expect(status).toBe(HttpStatus.OK);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<Komponente>;

            expect(body).toBeDefined();

            body.content
                .map((pc: { name: string }) => pc.name)
                .forEach((n: string) =>
                    expect(n.toLowerCase()).toStrictEqual(
                        expect.stringContaining(name.toLowerCase()),
                    ),
                );
        },
    );

    /**
     * Testet die Suche mit einem Teil-Namen, der zu keinen Ergebnissen führt.
     * Erwartet HttpStatus.NOT_FOUND.
     * @param name Der nicht existierende Teil-Name.
     */
    test.concurrent.each(nameNichtVorhanden)(
        'Komponenten zu nicht vorhandenem Teil-Namen %s suchen',
        async (name) => {
            // given
            const params = new URLSearchParams({ name });
            const url = `${restURL}?${params}`;

            // when
            const { status } = await fetch(url);

            // then
            expect(status).toBe(HttpStatus.NOT_FOUND);
        },
    );

    /**
     * Testet die Suche nach Komponenten anhand eines spezifischen Komponententyps.
     * Erwartet HttpStatus.OK und nur Komponenten des angefragten Typs.
     * @param typ Der zu suchende Komponententyp.
     */
    test.concurrent.each(typen)(
        'Mind. 1 Komponente mit Typ %s',
        async (typ) => {
            // given
            const params = new URLSearchParams({ typ });
            const url = `${restURL}?${params}`;

            // when
            const response = await fetch(url);
            const { status, headers } = response;

            // then
            expect(status).toBe(HttpStatus.OK);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<Komponente>;

            expect(body).toBeDefined();

            body.content
                .map(
                    (pc: {
                        name: string;
                        id: number;
                        version: number;
                        typ: Komponententyp | null;
                    }) => pc.typ,
                )
                .forEach((t: Komponententyp | null) => expect(t).toBe(typ));
        },
    );

    /**
     * Testet die Suche mit einem ungültigen/nicht unterstützten Suchparameter.
     * Erwartet HttpStatus.NOT_FOUND.
     */
    test.concurrent(
        'Keine Komponenten zu einer nicht-vorhandenen Property',
        async () => {
            // given
            const params = new URLSearchParams({ foo: 'bar' });
            const url = `${restURL}?${params}`;

            // when
            const { status } = await fetch(url);

            // then
            expect(status).toBe(HttpStatus.NOT_FOUND);
        },
    );
});