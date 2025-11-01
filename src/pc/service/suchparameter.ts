// Copyright (C) 2024 DEIN NAME, Hochschule Karlsruhe
// Angepasst von der Vorlage von Juergen Zimmermann

import { type Komponententyp } from '../../generated/prisma/client.js';

// Typdefinition für `find`
export type Suchparameter = {
    readonly name?: string;
    readonly typ?: Komponententyp;
    // 'hersteller' koennte man hier als String hinzufuegen
};

// Gueltige Namen fuer die Suchparameter
export const suchparameterNamen = [
    'name',
    'typ',
];
