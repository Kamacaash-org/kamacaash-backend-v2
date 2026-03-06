import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessContract } from './entities/business-contract.entity';
import { StaffUser } from '../staff/entities/staff-user.entity';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { S3UploadService } from '../../common/services/s3-upload.service';
import { UploadedFile } from '../../common/types/uploaded-file.type';
import { Business } from './entities/business.entity';
import {
    ContractBusinessShortDto,
    SignedBusinessContractResponseDto,
    UploadContractDto,
    UploadContractResponseDto,
} from './dto/business-contract.dto';

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
            .leftJoinAndSelect('business.primary_staff', 'primary_staff')
            .leftJoin(BusinessContract, 'contract', 'contract.business_id = business.id')
            .where('contract.id IS NULL')
            .orderBy('business.created_at', 'DESC')
            .getMany();

        const data = businessesWithoutContract.map((business) => this.mapBusinessShort(business));
        return ApiResponseDto.success('Businesses without contract fetched successfully', data);
    }

    async getBusinessWithContract(): Promise<ApiResponseDto<SignedBusinessContractResponseDto[]>> {
        const contracts = await this.contractRepository.find({
            relations: ['business', 'business.primary_staff', 'uploader'],
            order: { created_at: 'DESC' },
        });

        const data = contracts.map((c) => ({
            business: this.mapBusinessShort(c.business),
            contract: {
                id: c.id,
                business_id: c.business_id,
                contract_number: c.contract_number,
                version: c.version,
                is_signed: true,
                signed_at: c.signed_at,
                signed_by_ip: c.signed_by_ip,
                agreement_pdf_url: c.agreement_pdf_url,
                payout_schedule: c.payout_schedule,
                commission_rate_bps: c.commission_rate_bps,
                fixed_commission_minor: c.fixed_commission_minor,
                minimum_payout_minor: c.minimum_payout_minor,
                effective_from: c.effective_from,
                effective_to: c.effective_to,
                auto_renew: c.auto_renew,
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
    ): Promise<ApiResponseDto<UploadContractResponseDto>> {
        const business = await this.businessRepository.findOne({
            where: { id: businessId },
            relations: ['primary_staff'],
        });

        if (!business) throw new NotFoundException('Business not found');

        const existing = await this.contractRepository.findOne({
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
        contract.commission_rate_bps = dto.commission_rate_bps ?? 1000;
        contract.fixed_commission_minor = dto.fixed_commission_minor ?? 0;
        contract.minimum_payout_minor = dto.minimum_payout_minor ?? 1000;
        contract.effective_from = dto.effective_from ? new Date(dto.effective_from) : new Date();
        contract.effective_to = dto.effective_to ? new Date(dto.effective_to) : null;
        contract.auto_renew = dto.auto_renew ?? true;
        contract.is_signed = true;
        contract.signed_at = new Date();
        contract.signed_by_ip = ip;
        contract.uploader_id = staff?.id || null;
        contract.agreement_pdf_url = agreementPdfUrl;
        await this.contractRepository.save(contract);

        return ApiResponseDto.success('Contract uploaded successfully', {
            business: this.mapBusinessShort(business),
            contract: {
                id: contract.id,
                business_id: contract.business_id,
                contract_number: contract.contract_number,
                version: contract.version,
                is_signed: true,
                signed_at: contract.signed_at,
                signed_by_ip: contract.signed_by_ip,
                agreement_pdf_url: contract.agreement_pdf_url,
                payout_schedule: contract.payout_schedule,
                commission_rate_bps: contract.commission_rate_bps,
                fixed_commission_minor: contract.fixed_commission_minor,
                minimum_payout_minor: contract.minimum_payout_minor,
                effective_from: contract.effective_from,
                effective_to: contract.effective_to,
                auto_renew: contract.auto_renew,
            },
        });
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

    private mapBusinessShort(business: Business): ContractBusinessShortDto {
        const staff = business?.primary_staff;
        return {
            id: business.id,
            display_name: business.display_name,
            owner_name: business.owner_name,
            city: business.city,
            phone_e164: business.phone_e164,
            primary_staff: staff
                ? {
                    name: `${staff.first_name} ${staff.last_name}`,
                    phone: staff.phone_e164,
                }
                : { name: null, phone: null },
        };
    }
}
