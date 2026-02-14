import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';

@Injectable()
export class FavoritesService {
    constructor(
        @InjectRepository(Favorite)
        private favoritesRepository: Repository<Favorite>,
    ) { }

    async toggle(userId: string, businessId: string) {
        const existing = await this.favoritesRepository.findOne({ where: { user_id: userId, business_id: businessId } });

        if (existing) {
            if (existing.is_removed) {
                existing.is_removed = false;
                existing.removed_at = null as any; // Cast to any to allow nulling date
                return this.favoritesRepository.save(existing);
            } else {
                existing.is_removed = true;
                existing.removed_at = new Date();
                return this.favoritesRepository.save(existing);
            }
        }

        const favorite = this.favoritesRepository.create({
            user_id: userId,
            business_id: businessId
        });
        return this.favoritesRepository.save(favorite);
    }

    async findAll(userId: string) {
        return this.favoritesRepository.find({
            where: { user_id: userId, is_removed: false },
            relations: ['business']
        });
    }
}
