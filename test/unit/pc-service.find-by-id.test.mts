import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    Komponententyp,
    Prisma,
    PrismaClient,
} from '../../src/generated/prisma/client.js';
import {
    type PcMitHerstellerUndSpezifikation,
    PcService,
} from '../../src/pc/service/pc-service.js';
import { PrismaService } from '../../src/pc/service/prisma-service.js';
import { WhereBuilder } from '../../src/pc/service/where-builder.js';

/**
 * Testet die `findById`-Methode des `PcService`.
 */
describe('PcService findById', () => {
    /** Die Instanz des `PcService`, die in jedem Test neu erstellt wird. */
    let service: PcService;
    /** Ein Mock für den `PrismaService`, um Datenbankinteraktionen zu simulieren. */
    let prismaServiceMock: PrismaService;

    /**
     * Setzt die Mock-Umgebung für jeden Testlauf zurück.
     * Erstellt einen Mock für `findUnique` der Prisma-Komponente.
     */
    beforeEach(() => {
        const findUniqueMock =
            vi.fn<PrismaClient['komponente']['findUnique']>();
        prismaServiceMock = {
            client: {
                komponente: {
                    findUnique: findUniqueMock,
                },
            },
        } as any;

        const whereBuilder = new WhereBuilder();
        service = new PcService(prismaServiceMock, whereBuilder);
    });

    /**
     * Testet das erfolgreiche Abrufen einer Komponente anhand einer existierenden ID.
     * Erwartet, dass die gemockten Daten zurückgegeben werden.
     */
    test('id vorhanden', async () => {
        // given
        const id = 10;
        const pcMock: PcMitHerstellerUndSpezifikation = {
            id,
            version: 0,
            name: 'GeForce RTX 4080',
            typ: Komponententyp.GPU,
            preis: new Prisma.Decimal(1299.99),
            herstellerId: 1,
            hersteller: {
                id: 1,
                name: 'Nvidia',
                gruendungsjahr: 1993,
            },
            spezifikation: {
                id: 1,
                kerntaktMhz: 2505,
                speicherGb: 16,
                leserateMbps: null,
                komponenteId: id,
            },
        };
        (
            prismaServiceMock.client.komponente.findUnique as any
        ).mockResolvedValueOnce(pcMock);

        // when
        const pc = await service.findById({ id });

        // then
        expect(pc).toStrictEqual(pcMock);
    });

    /**
     * Testet das Abrufen einer Komponente mit einer nicht-existierenden ID.
     * Erwartet, dass ein Fehler (Exception) geworfen wird.
     */
    test('id nicht vorhanden', async () => {
        // given
        const id = 999;
        (
            prismaServiceMock.client.komponente.findUnique as any
        ).mockResolvedValue(null);

        // when / then
        await expect(service.findById({ id })).rejects.toThrow(
            `Es gibt keine Komponente mit der ID ${id}.`,
        );
    });
});
