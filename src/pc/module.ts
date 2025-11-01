/**
 * Das Modul besteht aus Controller-, Service- und Resolver-Klassen
 * für die Verwaltung von PC-Komponenten.
 * @packageDocumentation
 */

import { Module } from '@nestjs/common';
import { MailModule } from '../mail/module.js';
import { KeycloakModule } from '../security/keycloak/module.js';

import { PcController } from './controller/pc-controller.js';
import { PcWriteController } from './controller/pc-write-controller.js';

import { PcMutationResolver } from './resolver/pc-mutation.resolver.js';
import { PcQueryResolver } from './resolver/pc-query.resolver.js';

import { PcService } from './service/pc-service.js';
import { PcWriteService } from './service/pc-write-service.js';
import { PrismaService } from './service/prisma-service.js';
import { WhereBuilder } from './service/where-builder.js';

/**
 * Die dekorierte Modul-Klasse mit Controller-, Service- und Resolver-Klassen
 * sowie der Funktionalität für Prisma.
 */
@Module({
    imports: [KeycloakModule, MailModule],
    controllers: [PcController, PcWriteController],
    // Provider sind z.B. Service-Klassen fuer DI
    providers: [
        PcService,
        PcWriteService,
        PcQueryResolver,
        PcMutationResolver,
        PrismaService,
        WhereBuilder,
    ],
    // Export der Provider fuer DI in anderen Modulen
    exports: [PcService, PcWriteService],
})
export class PcModule {}
