import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesService } from './businesses.service';
import { AdminBusinessesController } from './admin/admin-businesses.controller';
import { AppBusinessesController } from './app/app-businesses.controller';
import { Business } from './entities/business.entity';
import { BusinessOpeningHours } from './entities/business-opening-hours.entity';
import { BusinessStaff } from './entities/business-staff.entity';
import { BusinessBankAccount } from './entities/business-bank-account.entity';
import { BusinessContract } from './entities/business-contract.entity';
import { Country } from '../countries/entities/country.entity';
import { StaffUser } from '../staff/entities/staff-user.entity';
import { Offer } from '../offers/entities/offer.entity';
import { S3Module } from '../../common/s3.module';

@Module({
    imports: [
        S3Module,
        TypeOrmModule.forFeature([
            Business,
            BusinessOpeningHours,
            BusinessStaff,
            BusinessBankAccount,
            BusinessContract,
            Country,
            StaffUser,
            Offer,
        ]),
    ],
    controllers: [AdminBusinessesController, AppBusinessesController],
    providers: [BusinessesService],
    exports: [BusinessesService],
})
export class BusinessesModule { }
