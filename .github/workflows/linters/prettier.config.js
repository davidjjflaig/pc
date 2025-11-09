/**
 * CommonJS-Konfiguration NUR fuer den Super-Linter.
 * Diese Datei wird von Super-Linter bevorzugt und ueberschreibt die .mts-Datei
 * im Root-Verzeichnis waehrend des Linter-Laufs in GitHub Actions.
 *
 * WICHTIG: Das 'plugin-oxc' wurde entfernt, da es im
 * Super-Linter-Container nicht verfuegbar ist.
 */

/** @type {import("prettier").Config} */
const config = {
    singleQuote: true,
    tabWidth: 2,
    trailingComma: "all",
    overrides: [
        {
            files: ["*.ts", "*.mts", "*.js", "*.mjs", "*.cjs"],
            options: {
                tabWidth: 4,
            },
        },
        {
            files: ["*.yml", "*.yaml"],
            options: {
                singleQuote: false,
            },
        },
    ],
};

module.exports = config;
