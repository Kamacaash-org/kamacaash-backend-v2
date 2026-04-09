import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountriesService } from './countries.service';
import { AdminCountriesController } from './admin/admin-countries.controller';
import { Country } from './entities/country.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Country])],
    controllers: [AdminCountriesController],
    providers: [CountriesService],
    exports: [CountriesService],
})
export class CountriesModule { }
