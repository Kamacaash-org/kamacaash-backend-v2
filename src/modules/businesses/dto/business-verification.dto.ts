import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessVerificationStatus } from '../../../common/entities/enums/all.enums';
import { Business } from '../entities/business.entity';
export class BusinessVerificationListDto {
    @ApiProperty()
    id?: string;

    @ApiProperty()
    display_name?: string;

    @ApiPropertyOptional()
    category_name?: string;

    @ApiProperty()
    city_name?: string;

    @ApiProperty()
    phone?: string;

    @ApiPropertyOptional()
    logo_url?: string;

    @ApiPropertyOptional()
    license_document_url?: string;

    @ApiPropertyOptional()
    primary_staff_name?: string;

    @ApiPropertyOptional()
    primary_staff_phone?: string;

    @ApiProperty({ enum: BusinessVerificationStatus })
    verification_status?: BusinessVerificationStatus;

    @ApiPropertyOptional()
    verified_at?: Date;

    @ApiPropertyOptional()
    verified_by_name?: string;

    @ApiPropertyOptional()
    rejected_at?: Date;

    @ApiPropertyOptional()
    rejected_by_name?: string;

    @ApiPropertyOptional()
    rejection_reason?: string;

    @ApiPropertyOptional()
    created_at?: Date;

    static fromEntity(business: Business): BusinessVerificationListDto {
        return {
            id: business.id,
            display_name: business.display_name,
            category_name: business.category?.name,
            city_name: business.city?.name,
            phone: business.phone,
            logo_url: business.logo_url,
            license_document_url: business.license_document_url,
            primary_staff_name: business.primary_staff
                ? `${business.primary_staff.first_name} ${business.primary_staff.last_name}`
                : undefined,
            primary_staff_phone: business.primary_staff?.phone_e164,
            verification_status: business.verification_status,
            verified_at: business.verification_reviewed_at,
            verified_by_name: business.verified_by_admin
                ? `${business.verified_by_admin.first_name} ${business.verified_by_admin.last_name}`
                : undefined,
            rejected_at: business.verification_status === BusinessVerificationStatus.REJECTED
                ? business.verification_reviewed_at
                : undefined,
            rejected_by_name: business.rejecter
                ? `${business.rejecter.first_name} ${business.rejecter.last_name}`
                : undefined,
            rejection_reason: business.verification_rejection_reason,
            created_at: business.created_at,
        };
    }
}