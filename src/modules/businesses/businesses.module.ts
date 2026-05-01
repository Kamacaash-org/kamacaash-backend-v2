import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesService } from './businesses.service';
import { AdminBusinessesController } from './admin/admin-businesses.controller';
import { AppBusinessesController } from './app/app-businesses.controller';
import { Business } from './entities/business.entity';
import { BusinessContract } from './entities/business-contract.entity';
import { Country } from '../countries/entities/country.entity';
import { StaffUser } from '../staff/entities/staff-user.entity';
import { Offer } from '../offers/entities/offer.entity';
import { S3Module } from '../../common/s3.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Business,
            BusinessContract,
            Country,
            StaffUser,
            Offer,
        ]),
        S3Module,
    ],
    controllers: [AdminBusinessesController, AppBusinessesController],
    providers: [BusinessesService],
    exports: [BusinessesService],
})
export class BusinessesModule { }
