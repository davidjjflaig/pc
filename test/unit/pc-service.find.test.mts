import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    Komponententyp,
    Prisma,
    PrismaClient,
} from '../../src/generated/prisma/client.js';
import { type Pageable } from '../../src/pc/service/pageable.js';
import {
    type PcMitHerstellerUndSpezifikation,
    PcService,
} from '../../src/pc/service/pc-service.js';
import { PrismaService } from '../../src/pc/service/prisma-service.js';
import { type Suchparameter } from '../../src/pc/service/suchparameter.js';
import { WhereBuilder } from '../../src/pc/service/where-builder.js';

/**
 * Testet die `find`-Methode des `PcService`.
 */
describe('PcService find', () => {
    /** Die Instanz des `PcService`, die in jedem Test neu erstellt wird. */
    let service: PcService;
    /** Ein Mock für den `PrismaService`, um Datenbankinteraktionen zu simulieren. */
    let prismaServiceMock: PrismaService;

    /**
     * Setzt die Mock-Umgebung für jeden Testlauf zurück.
     * Erstellt Mocks für `findMany` und `count` der Prisma-Komponente.
     */
    beforeEach(() => {
        const findManyMock = vi.fn<PrismaClient['komponente']['findMany']>();
        const countMock = vi.fn<PrismaClient['komponente']['count']>();
        prismaServiceMock = {
            client: {
                komponente: {
                    findMany: findManyMock,
                    count: countMock,
                },
            },
        } as any;

        const whereBuilder = new WhereBuilder();
        service = new PcService(prismaServiceMock, whereBuilder);
    });

    /**
     * Testet die erfolgreiche Suche nach Komponenten anhand eines Namens.
     * Erwartet, dass die gemockten Daten in einer Paginierungsstruktur zurückgegeben werden.
     */
    test('name vorhanden', async () => {
        // given
        const name = 'GeForce';
        const suchparameter: Suchparameter = { name };
        const pageable: Pageable = { number: 1, size: 5 };
        const pcMock: PcMitHerstellerUndSpezifikation = {
            id: 10,
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
                komponenteId: 10,
            },
        };
        (
            prismaServiceMock.client.komponente.findMany as any
        ).mockResolvedValueOnce([pcMock]);
        (
            prismaServiceMock.client.komponente.count as any
        ).mockResolvedValueOnce(1);

        // when
        const result = await service.find(suchparameter, pageable);

        // then
        const { content } = result;

        expect(content).toHaveLength(1);
        expect(content[0]).toStrictEqual(pcMock);
    });

    /**
     * Testet die Suche nach Komponenten, wenn keine Ergebnisse gefunden werden.
     * Erwartet, dass ein Fehler (Exception) geworfen wird.
     */
    test('name nicht vorhanden', async () => {
        // given
        const name = 'NichtVorhanden';
        const suchparameter: Suchparameter = { name };
        const pageable: Pageable = { number: 1, size: 5 };
        (prismaServiceMock.client.komponente.findMany as any).mockResolvedValue(
            [],
        );

        // when / then
        await expect(service.find(suchparameter, pageable)).rejects.toThrow(
            /^Keine Komponenten gefunden/,
        );
    });
});
