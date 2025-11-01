/**
 * Das Modul besteht aus der DTO-Klasse für Spezifikationen.
 * @packageDocumentation
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

/**
 * Entity-Klasse für Spezifikationen.
 */
export class SpezifikationDTO {
    @IsInt()
    @IsOptional()
    @ApiProperty({ example: 3400, type: Number })
    readonly kerntaktMhz: number | undefined;

    @IsInt()
    @IsOptional()
    @ApiProperty({ example: 16, type: Number })
    readonly speicherGb: number | undefined;

    @IsInt()
    @IsOptional()
    @ApiProperty({ example: 7450, type: Number })
    readonly leserateMbps: number | undefined;
}
