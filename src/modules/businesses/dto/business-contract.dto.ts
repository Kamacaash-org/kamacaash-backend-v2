import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutSchedule } from '../../../common/entities/enums/all.enums';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  IsDateString,
} from 'class-validator';

export class GetContractsQueryDto {
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  signed?: 'true' | 'false';
}

export class UploadContractDto {
  @ApiProperty()
  @IsString()
  @MaxLength(20)
  version!: string;

  @ApiPropertyOptional({ enum: PayoutSchedule, default: PayoutSchedule.WEEKLY })
  @IsOptional()
  @IsIn(Object.values(PayoutSchedule))
  payout_schedule?: PayoutSchedule;

  @ApiPropertyOptional({ default: 10, description: 'Commission percent, e.g. 10 for 10%' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commission_rate?: number;

  @ApiPropertyOptional({ default: 0, description: 'Fixed commission in normal currency units' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixed_commission?: number;

  @ApiPropertyOptional({ default: 10, description: 'Minimum payout in normal currency units' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_payout?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  auto_renew?: boolean;
}

export class ContractPrimaryStaffDto {
  @ApiPropertyOptional()
  name?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;
}

export class ContractBusinessShortDto {
  @ApiProperty()
  @IsUUID()
  id?: string;

  @ApiProperty()
  display_name?: string;


  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  currency_symbol?: string;

  city?: string;

  verified_at?: Date;

  verified_by_name?: string;

  @ApiProperty({ type: ContractPrimaryStaffDto })
  primary_staff?: ContractPrimaryStaffDto;
}

export class SignedContractDataDto {
  @ApiProperty()
  id?: string;

  @ApiProperty()
  business_id?: string;

  @ApiProperty()
  contract_number?: string;

  @ApiProperty()
  version?: string;

  @ApiProperty()
  is_signed?: boolean;

  @ApiPropertyOptional()
  signed_at?: Date | null;

  @ApiPropertyOptional()
  signed_by_ip?: string | null;

  @ApiPropertyOptional()
  agreement_pdf_url?: string | null;

  @ApiProperty({ enum: PayoutSchedule })
  payout_schedule?: PayoutSchedule;

  @ApiProperty()
  commission_rate?: string;

  @ApiProperty()
  fixed_commission?: string;

  @ApiProperty()
  minimum_payout?: string;

  @ApiProperty()
  effective_from?: Date;

  @ApiPropertyOptional()
  effective_to?: Date | null;

  @ApiProperty()
  auto_renew?: boolean;
}

export class SignedBusinessContractResponseDto {
  @ApiProperty({ type: ContractBusinessShortDto })
  business?: ContractBusinessShortDto;

  @ApiProperty({ type: SignedContractDataDto })
  contract?: SignedContractDataDto;
}

export class UploadContractResponseDto {
  @ApiProperty({ type: ContractBusinessShortDto })
  business?: ContractBusinessShortDto;

  @ApiProperty({ type: SignedContractDataDto })
  contract?: SignedContractDataDto;
}

export type ContractBusinessRowDto = {
  id: string;
  display_name: string;
  phone: string;
  currency_symbol: string | null;
  city: string | null;
  verified_at: Date | null;
  verified_by_first_name: string | null;
  verified_by_last_name: string | null;
  primary_staff_first_name: string | null;
  primary_staff_last_name: string | null;
  primary_staff_phone: string | null;
};

export type SignedBusinessContractRowDto = {
  business_id: string;
  business_display_name: string;
  business_phone: string;
  business_currency_symbol: string | null;
  business_city: string | null;
  business_verified_at: Date | null;
  verified_by_first_name: string | null;
  verified_by_last_name: string | null;
  primary_staff_first_name: string | null;
  primary_staff_last_name: string | null;
  primary_staff_phone: string | null;
  contract_id: string;
  contract_business_id: string;
  contract_number: string;
  version: string;
  is_signed: boolean;
  signed_at: Date | null;
  signed_by_ip: string | null;
  agreement_pdf_url: string | null;
  payout_schedule: PayoutSchedule;
  commission_rate: string | number;
  fixed_commission: string | number;
  minimum_payout: string | number;
  effective_from: Date;
  effective_to: Date | null;
  auto_renew: boolean;
};
