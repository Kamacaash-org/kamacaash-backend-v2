import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payout } from './entities/payout.entity';

@Injectable()
export class PayoutsService {
    constructor(
        @InjectRepository(Payout)
        private payoutsRepository: Repository<Payout>,
    ) { }

    async findAll(businessId?: string) {
        const where: any = {};
        if (businessId) where.business_id = businessId;
        return this.payoutsRepository.find({ where, order: { created_at: 'DESC' } });
    }

    async createPayout(businessId: string, periodStart: Date, periodEnd: Date) {
        // Complex logic to aggregate orders and calculate payout
        // For now, placeholder
        return { message: 'Payout generation logic to be implemented' };
    }
}
