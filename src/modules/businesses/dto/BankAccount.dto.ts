import {
    IsOptional,
    IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBusinessBankAccountDto {
    @ApiProperty()
    @IsString()
    account_holder_name: string;

    @ApiProperty()
    @IsString()
    bank_name: string;

    @ApiProperty()
    @IsString()
    account_number: string;

    @ApiProperty()
    @IsString()
    merchant_holder_name: string;

    @ApiProperty()
    @IsString()
    merchant_name: string;

    @ApiProperty()
    @IsString()
    merchant_number: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sort_code?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    iban?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    swift_bic?: string;
}