import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { AdminCategoriesController } from './admin/admin-categories.controller';
import { AppCategoriesController } from './app/app-categories.controller';
import { BusinessCategory } from './entities/business-category.entity';
import { S3Module } from '../../common/s3.module';

@Module({
    imports: [S3Module, TypeOrmModule.forFeature([BusinessCategory])],
    controllers: [AdminCategoriesController, AppCategoriesController],
    providers: [CategoriesService],
    exports: [CategoriesService],
})
export class CategoriesModule { }
