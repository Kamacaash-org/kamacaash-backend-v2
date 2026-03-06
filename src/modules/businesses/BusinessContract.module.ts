import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessContractService } from './BusinessContract.service';
import { BusinessContractController } from './BusinessContract.controller';
import { Business } from './entities/business.entity';
import { BusinessOpeningHours } from './entities/business-opening-hours.entity';
import { BusinessStaff } from './entities/business-staff.entity';
import { BusinessBankAccount } from './entities/business-bank-account.entity';
import { BusinessContract } from './entities/business-contract.entity';
import { Country } from '../countries/entities/country.entity';
import { StaffUser } from '../staff/entities/staff-user.entity';
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
        ]),
    ],
    controllers: [BusinessContractController],
    providers: [BusinessContractService],
    exports: [BusinessContractService],
})
export class BusinessContractModule { }
