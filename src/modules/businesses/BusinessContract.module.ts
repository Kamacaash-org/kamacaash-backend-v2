import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessContractService } from './BusinessContract.service';
import { AdminBusinessContractController } from './admin/admin-business-contract.controller';
import { Business } from './entities/business.entity';
import { BusinessContract } from './entities/business-contract.entity';
import { Country } from '../countries/entities/country.entity';
import { StaffUser } from '../staff/entities/staff-user.entity';
import { S3Module } from '../../common/s3.module';

@Module({
    imports: [
        S3Module,
        TypeOrmModule.forFeature([
            Business,
            BusinessContract,
            Country,
            StaffUser,
        ]),
    ],
    controllers: [AdminBusinessContractController],
    providers: [BusinessContractService],
    exports: [BusinessContractService],
})
export class BusinessContractModule { }
