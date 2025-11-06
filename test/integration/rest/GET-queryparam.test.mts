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

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const nameArray = ['GeForce', 'Ryzen'];
const nameNichtVorhanden = ['xxx', 'yyy', 'zzz'];
const typen: Komponententyp[] = ['CPU', 'GPU'];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
describe('GET /rest', () => {
    test.concurrent('Alle Komponenten', async () => {
        // given

        // when
        const response = await fetch(restURL);
        const { status, headers } = response;

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

        const body = (await response.json()) as Page<Komponente>;

        // Korrektur: Leerzeile eingefügt
        expect(body).toBeDefined();
        body.content
            .map((pc: Komponente) => pc.id)
            .forEach((id) => {
                expect(id).toBeDefined();
            });
    });

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

            // Korrektur: Leerzeile eingefügt
            expect(body).toBeDefined();

            // Korrektur: Explizite Typisierung für 'pc'
            body.content
                .map((pc: { name: string }) => pc.name)
                .forEach((n: string) =>
                    expect(n.toLowerCase()).toStrictEqual(
                        expect.stringContaining(name.toLowerCase()),
                    ),
                );
        },
    );

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

            // Korrektur: Leerzeile eingefügt
            expect(body).toBeDefined();

            // Korrektur: Explizite Typisierung für 'pc' und 't'
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
