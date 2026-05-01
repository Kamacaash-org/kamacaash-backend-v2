import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessContract } from './entities/business-contract.entity';
import { StaffUser } from '../staff/entities/staff-user.entity';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { S3UploadService } from '../../common/services/s3-upload.service';
import { UploadedFile } from '../../common/types/uploaded-file.type';
import { Business } from './entities/business.entity';
import {
    ContractBusinessRowDto,
    ContractBusinessShortDto,
    SignedBusinessContractResponseDto,
    SignedBusinessContractRowDto,
    UploadContractDto,
} from './dto/business-contract.dto';
import { BusinessVerificationStatus, PayoutSchedule } from '../../common/entities/enums/all.enums';

@Injectable()
export class BusinessContractService {
    constructor(
        @InjectRepository(BusinessContract)
        private readonly contractRepository: Repository<BusinessContract>,
        @InjectRepository(Business)
        private readonly businessRepository: Repository<Business>,
        private readonly s3UploadService: S3UploadService,
    ) { }

    async getBusinessWithNoContract(): Promise<ApiResponseDto<ContractBusinessShortDto[]>> {
        const businessesWithoutContract = await this.businessRepository
            .createQueryBuilder('business')
            .leftJoin('business.primary_staff', 'primary_staff')
            .leftJoin('business.verified_by_admin', 'verified_by_admin')
            .leftJoin('business.city', 'city')
            .leftJoin('city.country', 'country')
            .leftJoin(BusinessContract, 'contract', 'contract.business_id = business.id')
            .where('contract.id IS NULL')
            .andWhere('business.verification_status = :verified', {
                verified: BusinessVerificationStatus.VERIFIED,
            })
            .select([
                'business.id AS id',
                'business.display_name AS display_name',
                'business.phone AS phone',
                'country.currency_symbol AS currency_symbol',
                'city.name AS city',
                'business.verification_reviewed_at AS verified_at',
                'verified_by_admin.first_name AS verified_by_first_name',
                'verified_by_admin.last_name AS verified_by_last_name',
                'primary_staff.first_name AS primary_staff_first_name',
                'primary_staff.last_name AS primary_staff_last_name',
                'primary_staff.phone_e164 AS primary_staff_phone',
            ])
            .orderBy('business.created_at', 'DESC')
            .getRawMany<ContractBusinessRowDto>();

        return ApiResponseDto.success(
            'Businesses without contract fetched successfully',
            businessesWithoutContract.map((row) => ({
                id: row.id,
                display_name: row.display_name,
                phone: row.phone,
                currency_symbol: row.currency_symbol ?? undefined,
                city: row.city ?? undefined,
                verified_at: row.verified_at ?? undefined,
                verified_by_name: row.verified_by_first_name
                    ? `${row.verified_by_first_name} ${row.verified_by_last_name ?? ''}`.trim()
                    : undefined,
                primary_staff: {
                    name: row.primary_staff_first_name
                        ? `${row.primary_staff_first_name} ${row.primary_staff_last_name ?? ''}`.trim()
                        : null,
                    phone: row.primary_staff_phone ?? null,
                },
            })),
        );
    }

    async getBusinessWithContract(): Promise<ApiResponseDto<SignedBusinessContractResponseDto[]>> {
        const contracts = await this.contractRepository
            .createQueryBuilder('contract')
            .leftJoin('contract.business', 'business')
            .leftJoin('business.city', 'city')
            .leftJoin('city.country', 'country')
            .leftJoin('business.primary_staff', 'primary_staff')
            .leftJoin('business.verified_by_admin', 'verified_by_admin')
            .select([
                'business.id AS business_id',
                'business.display_name AS business_display_name',
                'business.phone AS business_phone',
                'country.currency_symbol AS business_currency_symbol',
                'city.name AS business_city',
                'business.verification_reviewed_at AS business_verified_at',
                'verified_by_admin.first_name AS verified_by_first_name',
                'verified_by_admin.last_name AS verified_by_last_name',
                'primary_staff.first_name AS primary_staff_first_name',
                'primary_staff.last_name AS primary_staff_last_name',
                'primary_staff.phone_e164 AS primary_staff_phone',
                'contract.id AS contract_id',
                'contract.business_id AS contract_business_id',
                'contract.contract_number AS contract_number',
                'contract.version AS version',
                'contract.is_signed AS is_signed',
                'contract.signed_at AS signed_at',
                'contract.signed_by_ip AS signed_by_ip',
                'contract.agreement_pdf_url AS agreement_pdf_url',
                'contract.payout_schedule AS payout_schedule',
                'contract.effective_from AS effective_from',
                'contract.effective_to AS effective_to',
                'contract.auto_renew AS auto_renew',
            ])
            .addSelect('contract.commission_rate_bps / 100.0', 'commission_rate')
            .addSelect('contract.fixed_commission_minor / 100.0', 'fixed_commission')
            .addSelect('contract.minimum_payout_minor / 100.0', 'minimum_payout')
            .orderBy('contract.created_at', 'DESC')
            .getRawMany<SignedBusinessContractRowDto>();

        const data: SignedBusinessContractResponseDto[] = contracts.map((row) => ({
            business: {
                id: row.business_id,
                display_name: row.business_display_name,
                phone: row.business_phone,
                currency_symbol: row.business_currency_symbol ?? undefined,
                city: row.business_city ?? undefined,
                verified_at: row.business_verified_at ?? undefined,
                verified_by_name: row.verified_by_first_name
                    ? `${row.verified_by_first_name} ${row.verified_by_last_name ?? ''}`.trim()
                    : undefined,
                primary_staff: {
                    name: row.primary_staff_first_name
                        ? `${row.primary_staff_first_name} ${row.primary_staff_last_name ?? ''}`.trim()
                        : null,
                    phone: row.primary_staff_phone ?? null,
                },
            },
            contract: {
                id: row.contract_id,
                business_id: row.contract_business_id,
                contract_number: row.contract_number,
                version: row.version,
                is_signed: row.is_signed,
                signed_at: row.signed_at,
                signed_by_ip: row.signed_by_ip,
                agreement_pdf_url: row.agreement_pdf_url,
                payout_schedule: row.payout_schedule,
                commission_rate: Number(row.commission_rate) + "%",
                fixed_commission: Number(row.fixed_commission) + (row.business_currency_symbol ?? '$'),
                minimum_payout: Number(row.minimum_payout) + (row.business_currency_symbol ?? '$'),
                effective_from: row.effective_from,
                effective_to: row.effective_to,
                auto_renew: row.auto_renew,
            },
        }));

        return ApiResponseDto.success('Businesses with contract fetched successfully', data);
    }

    async uploadContract(
        businessId: string,
        dto: UploadContractDto,
        staff: StaffUser,
        ip: string,
        contractDocument: UploadedFile | undefined,
    ): Promise<ApiResponseDto<null>> {
        const businessExists = await this.businessRepository.exists({
            where: { id: businessId },
        });
        if (!businessExists) throw new NotFoundException('Business not found');

        const existing = await this.contractRepository.exists({
            where: { business_id: businessId },
        });
        if (existing) {
            throw new BadRequestException('Business already has a contract');
        }

        if (!contractDocument) {
            throw new BadRequestException('contractDocument file is required');
        }

        const agreementPdfUrl = await this.s3UploadService.uploadFile(
            contractDocument,
            'contracts/documents',
        );

        const contract = new BusinessContract();
        contract.business_id = businessId;
        contract.contract_number = await this.generateNextContractNumber();
        contract.version = dto.version;
        contract.payout_schedule = dto.payout_schedule ?? contract.payout_schedule;
        contract.commission_rate_bps = dto.commission_rate !== undefined
            ? Math.round(dto.commission_rate * 100)
            : 1000;
        contract.fixed_commission_minor = dto.fixed_commission !== undefined
            ? Math.round(dto.fixed_commission * 100)
            : 0;
        contract.minimum_payout_minor = dto.minimum_payout !== undefined
            ? Math.round(dto.minimum_payout * 100)
            : 1000;
        contract.effective_from = dto.effective_from ? new Date(dto.effective_from) : new Date();
        contract.effective_to = dto.effective_to ? new Date(dto.effective_to) : null;
        contract.auto_renew = dto.auto_renew ?? true;
        contract.is_signed = true;
        contract.signed_at = new Date();
        contract.signed_by_ip = ip;
        contract.uploader_id = staff?.id || null;
        contract.agreement_pdf_url = agreementPdfUrl;
        await this.contractRepository.save(contract);

        return ApiResponseDto.success('Contract uploaded successfully', null);
    }

    private async generateNextContractNumber(): Promise<string> {
        const prefix = 'CNT-';
        let next = (await this.contractRepository.count()) + 1;

        while (true) {
            const candidate = `${prefix}${String(next).padStart(6, '0')}`;
            const exists = await this.contractRepository.exists({
                where: { contract_number: candidate },
            });
            if (!exists) return candidate;
            next += 1;
        }
    }
}
