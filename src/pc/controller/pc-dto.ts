// Copyright (C) 2024 DEIN NAME, Hochschule Karlsruhe
// Angepasst von der Vorlage von Juergen Zimmermann

/**
 * Das Modul besteht aus den DTO-Klassen für eine PC-Komponente.
 * @packageDocumentation
 */

/* eslint-disable max-classes-per-file, @typescript-eslint/no-magic-numbers */

import { ApiProperty } from '@nestjs/swagger';
import BigNumber from 'bignumber.js';
import { Transform, Type } from 'class-transformer';
import {
    IsInt,
    Matches,
    Min,
    Validate,
    ValidateNested,
    type ValidationArguments,
    ValidatorConstraint,
    type ValidatorConstraintInterface,
} from 'class-validator';
import { Komponententyp } from '../../generated/prisma/client.js';
import { SpezifikationDTO } from './spezifikation-dto.js';

const number2Decimal = ({ value }: { value: BigNumber.Value | undefined }) => {
    if (value === undefined) {
        return;
    }
    BigNumber.set({ DECIMAL_PLACES: 2 });
    return BigNumber(value);
};

@ValidatorConstraint({ name: 'decimalMin', async: false })
class DecimalMin implements ValidatorConstraintInterface {
    validate(value: BigNumber | undefined, args: ValidationArguments) {
        if (value === undefined) {
            return true;
        }
        const [minValue]: BigNumber[] = args.constraints;
        return value.isGreaterThan(minValue!);
    }
    defaultMessage(args: ValidationArguments) {
        return `Der Wert muss groesser oder gleich ${(
            args.constraints[0] as BigNumber
        ).toNumber()} sein.`;
    }
}

/**
 * Entity-Klasse für PCs/Komponenten ohne 1:1-Referenz (z.B. für Updates).
 */
export class PcDtoOhneRef {
    @Matches(String.raw`^\w.*`)
    @ApiProperty({ example: 'GeForce RTX 4080', type: String })
    readonly name!: string;

    @Matches(/^(CPU|GPU|RAM|SSD)$/u)
    @ApiProperty({ example: 'GPU', type: String })
    readonly typ!: Komponententyp;

    @Transform(number2Decimal)
    @Validate(DecimalMin, [BigNumber(0)], {
        message: 'preis muss positiv sein.',
    })
    @ApiProperty({ example: 1299.99, type: Number })
    readonly preis!: BigNumber;

    @IsInt()
    @Min(1)
    @ApiProperty({
        example: 1,
        type: Number,
        description: 'ID des Herstellers',
    })
    readonly herstellerId!: number;
}

/**
 * Komplette Entity-Klasse für PCs/Komponenten (z.B. für Neuanlage).
 */
export class PcDTO extends PcDtoOhneRef {
    @ValidateNested()
    @Type(() => SpezifikationDTO)
    @ApiProperty({ type: SpezifikationDTO })
    readonly spezifikation!: SpezifikationDTO;
}
/* eslint-enable max-classes-per-file, @typescript-eslint/no-magic-numbers */
