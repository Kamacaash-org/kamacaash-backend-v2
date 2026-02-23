import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { BusinessCategory } from './entities/business-category.entity';
import { S3Module } from '../../common/s3.module';

@Module({
    imports: [S3Module, TypeOrmModule.forFeature([BusinessCategory])],
    controllers: [CategoriesController],
    providers: [CategoriesService],
    exports: [CategoriesService],
})
export class CategoriesModule { }
