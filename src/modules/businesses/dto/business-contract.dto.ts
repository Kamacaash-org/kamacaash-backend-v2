import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutSchedule } from '../../../common/entities/enums/all.enums';
import {
  IsBoolean,
  IsIn,
  IsInt,
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
  version: string;

  @ApiPropertyOptional({ enum: PayoutSchedule, default: PayoutSchedule.WEEKLY })
  @IsOptional()
  @IsIn(Object.values(PayoutSchedule))
  payout_schedule?: PayoutSchedule;

  @ApiPropertyOptional({ default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  commission_rate_bps?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  fixed_commission_minor?: number;

  @ApiPropertyOptional({ default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimum_payout_minor?: number;

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
  id: string;

  @ApiProperty()
  display_name: string;

  @ApiPropertyOptional()
  owner_name?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  phone_e164?: string;

  @ApiProperty({ type: ContractPrimaryStaffDto })
  primary_staff: ContractPrimaryStaffDto;
}

export class SignedContractDataDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  business_id: string;

  @ApiProperty()
  contract_number: string;

  @ApiProperty()
  version: string;

  @ApiProperty()
  is_signed: boolean;

  @ApiPropertyOptional()
  signed_at?: Date | null;

  @ApiPropertyOptional()
  signed_by_ip?: string | null;

  @ApiPropertyOptional()
  agreement_pdf_url?: string | null;

  @ApiProperty({ enum: PayoutSchedule })
  payout_schedule: PayoutSchedule;

  @ApiProperty()
  commission_rate_bps: number;

  @ApiProperty()
  fixed_commission_minor: number;

  @ApiProperty()
  minimum_payout_minor: number;

  @ApiProperty()
  effective_from: Date;

  @ApiPropertyOptional()
  effective_to?: Date | null;

  @ApiProperty()
  auto_renew: boolean;
}

export class SignedBusinessContractResponseDto {
  @ApiProperty({ type: ContractBusinessShortDto })
  business: ContractBusinessShortDto;

  @ApiProperty({ type: SignedContractDataDto })
  contract: SignedContractDataDto;
}

export class UploadContractResponseDto {
  @ApiProperty({ type: ContractBusinessShortDto })
  business: ContractBusinessShortDto;

  @ApiProperty({ type: SignedContractDataDto })
  contract: SignedContractDataDto;
}
