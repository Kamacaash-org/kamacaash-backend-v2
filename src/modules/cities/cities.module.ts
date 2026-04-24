import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Country } from '../countries/entities/country.entity';
import { AdminCitiesController } from './admin/admin-cities.controller';
import { CitiesService } from './cities.service';
import { City } from './entities/city.entity';

@Module({
  imports: [TypeOrmModule.forFeature([City, Country])],
  controllers: [AdminCitiesController],
  providers: [CitiesService],
  exports: [CitiesService],
})
export class CitiesModule { }
