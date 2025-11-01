/**
 * Das Hauptmodul der Anwendung, das alle anderen Module importiert und konfiguriert.
 * @packageDocumentation
 */

import { type ApolloDriverConfig } from '@nestjs/apollo';
import {
    type MiddlewareConsumer,
    Module,
    type NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { AdminModule } from './admin/module.js';
import { DevModule } from './config/dev/module.js';
import { graphQlModuleOptions } from './config/graphql.js';
import { LoggerModule } from './logger/module.js';
import { RequestLoggerMiddleware } from './logger/request-logger.js';
import { KeycloakModule } from './security/keycloak/module.js';

// Importiert das Haupt-Feature-Modul für PC-Komponenten
import { PcController } from './pc/controller/pc-controller.js';
import { PcWriteController } from './pc/controller/pc-write-controller.js';
import { PcModule } from './pc/module.js';

/**
 * Die dekorierte Modul-Klasse, die alle Sub-Module der Anwendung verbindet.
 */
@Module({
    imports: [
        AdminModule,
        PcModule,
        // Umgebungsvariable DATABASE_URL fuer PrismaPg
        ConfigModule,
        DevModule,
        GraphQLModule.forRoot<ApolloDriverConfig>(graphQlModuleOptions),
        LoggerModule,
        KeycloakModule,
    ],
})
export class AppModule implements NestModule {
    /**
     * Konfiguriert die Middleware für die Anwendung.
     * @param consumer Der MiddlewareConsumer, der die Middleware konfiguriert.
     */
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestLoggerMiddleware)
            .forRoutes(PcController, PcWriteController, 'auth', 'graphql');
    }
}
