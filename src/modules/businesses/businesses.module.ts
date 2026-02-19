import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { Business } from './entities/business.entity';
import { BusinessOpeningHours } from './entities/business-opening-hours.entity';
import { BusinessStaff } from './entities/business-staff.entity';
import { BusinessBankAccount } from './entities/business-bank-account.entity';
import { BusinessContract } from './entities/business-contract.entity';
import { Country } from '../countries/entities/country.entity';
import { StaffUser } from '../staff/entities/staff-user.entity';

@Module({
    imports: [
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
    controllers: [BusinessesController],
    providers: [BusinessesService],
    exports: [BusinessesService],
})
export class BusinessesModule { }
