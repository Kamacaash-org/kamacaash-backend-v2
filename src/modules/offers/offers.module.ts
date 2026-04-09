import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OffersService } from './offers.service';
import { AdminOffersController } from './admin/admin-offers.controller';
import { AppOffersController } from './app/app-offers.controller';
import { Offer } from './entities/offer.entity';
import { OfferPickupWindow } from './entities/offer-pickup-window.entity';
import { Business } from '../businesses/entities/business.entity';
import { S3Module } from '../../common/s3.module';

@Module({
    imports: [S3Module, TypeOrmModule.forFeature([Offer, OfferPickupWindow, Business])],
    controllers: [AdminOffersController, AppOffersController],
    providers: [OffersService],
    exports: [OffersService],
})
export class OffersModule { }
