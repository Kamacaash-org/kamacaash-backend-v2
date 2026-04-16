import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { AppFavoritesController } from './app/app-favorites.controller';
import { Favorite } from './entities/favorite.entity';
import { Business } from '../businesses/entities/business.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Favorite, Business])],
    controllers: [FavoritesController, AppFavoritesController],
    providers: [FavoritesService],
    exports: [FavoritesService],
})
export class FavoritesModule { }
