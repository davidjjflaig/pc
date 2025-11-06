import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    Komponententyp,
    Prisma,
    PrismaClient,
} from '../../src/generated/prisma/client.js';
import { MailService } from '../../src/mail/mail-service.js';
import { PcService } from '../../src/pc/service/pc-service.js';
import {
    type PcCreate,
    PcWriteService,
} from '../../src/pc/service/pc-write-service.js';
import { PrismaService } from '../../src/pc/service/prisma-service.js';
import { WhereBuilder } from '../../src/pc/service/where-builder.js';

/**
 * Testet die `create`-Methode des `PcWriteService`.
 */
describe('PcWriteService create', () => {
    /** Die Instanz des `PcWriteService`, die in jedem Test neu erstellt wird. */
    let service: PcWriteService;
    /** Ein Mock für den `PrismaService`, um Datenbankinteraktionen zu simulieren. */
    let prismaServiceMock: PrismaService;
    /** Die Instanz des `PcService` (Lesen), die den `prismaServiceMock` verwendet. */
    let readService: PcService;
    /** Die Instanz des `MailService`, wird für Tests gespie'd (spyOn). */
    let mailService: MailService;
    /** Eine Mock-Funktion, die `tx.komponente.create` innerhalb der Transaktion simuliert. */
    let pcCreateMock: ReturnType<typeof vi.fn>;

    /**
     * Setzt die Mock-Umgebung für jeden Testlauf zurück.
     * Baut Mocks für PrismaService (inkl. Transaktionen) und MailService auf.
     */
    beforeEach(() => {
        pcCreateMock = vi.fn<any>();
        const transactionMock = vi
            .fn<any>()
            .mockImplementation(async (cb: any) => {
                // Mock-Objekt für die Transaktion
                const tx = {
                    komponente: { create: pcCreateMock },
                };
                // Callback mit dem Mock-Objekt fuer die Transaktion aufrufen
                await cb(tx);
            });

        const countMock = vi.fn<PrismaClient['komponente']['count']>();

        prismaServiceMock = {
            client: {
                $transaction: transactionMock,
                komponente: {
                    count: countMock,
                },
            } as unknown,
        } as PrismaService;

        const whereBuilder = new WhereBuilder();
        readService = new PcService(prismaServiceMock, whereBuilder);

        // MailService mocken
        mailService = new MailService();
        vi.spyOn(mailService, 'sendmail').mockResolvedValue(undefined);

        service = new PcWriteService(
            prismaServiceMock,
            readService,
            mailService,
        );
    });

    /**
     * Testet das erfolgreiche Erstellen einer neuen Komponente.
     * Stellt sicher, dass die Transaktion aufgerufen wird und die
     * gemockte ID zurückgegeben wird.
     */
    test('Neue Komponente', async () => {
        // given
        const idMock = 100;
        const pc: PcCreate = {
            name: 'Test CPU',
            typ: Komponententyp.CPU,
            preis: new Prisma.Decimal(199.99),
            hersteller: {
                connect: { id: 3 },
            },
            spezifikation: {
                create: {
                    kerntaktMhz: 3000,
                },
            },
        };

        // Mock für die Rückgabe von tx.komponente.create
        const pcMockTemp: any = { ...pc };
        pcMockTemp.id = idMock;
        pcMockTemp.hersteller = { id: 3 }; // Vereinfachte Mock-Rückgabe
        pcMockTemp.spezifikation = { id: 101, komponenteId: idMock };
        pcCreateMock.mockResolvedValue(pcMockTemp);

        // when
        const id = await service.create(pc);

        // then
        expect(id).toBe(idMock);
    });
});
