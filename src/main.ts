/**
 * Das Modul startet den Webserver.
 * @packageDocumentation
 */

import process from 'node:process';
// Modul in JS = Datei
// Pfad innerhalb von Packages in node_modules ("nicht-relative Imports")
import {
    type INestApplication,
    type NestApplicationOptions,
    ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
    DocumentBuilder,
    type SwaggerCustomOptions,
    SwaggerModule,
} from '@nestjs/swagger';
import compression from 'compression';
// relativer Import
import { corsOptions } from './config/cors.js';
import { logLevel } from './config/logger.js';
import { nodeConfig } from './config/node.js';
import { paths } from './config/paths.js';
import { AppModule } from './module.js';
import { helmetHandlers } from './security/http/helmet.js';

// Destructuring ab ES 2015
const { httpsOptions, port } = nodeConfig;

// "Arrow Function" ab ES 2015
const setupSwagger = (app: INestApplication) => {
    const config = new DocumentBuilder()
        .setTitle('PC-Projekt')
        .setDescription('PC-Komponenten API')
        .setVersion('2025.11.1') // Deine Version
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    const options: SwaggerCustomOptions = {
        customSiteTitle: 'PC-Projekt 2025.11.1',
    };
    SwaggerModule.setup(paths.swagger, app, document, options);
};

// Promise ab ES 2015, vgl: Future in Java
// async/await ab ES 2017, vgl: C#
const bootstrap = async () => {
    // Der Keycloak-Server verwendet ein selbstsigniertes Zertifikat
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'; // eslint-disable-line n/no-process-env

    // https://expressjs.com/en/advanced/best-practice-security.html#use-tls
    const options: NestApplicationOptions =
        logLevel === 'debug'
            ? { httpsOptions }
            : { httpsOptions, logger: false };
    const app = await NestFactory.create(AppModule, options); // "Shorthand Properties" ab ES 2015

    // Middleware
    app.use(helmetHandlers, compression());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    setupSwagger(app);
    app.enableCors(corsOptions);

    await app.listen(port);
};

// Top-level await ab ES 2020
await bootstrap();
