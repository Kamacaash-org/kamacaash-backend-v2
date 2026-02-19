import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity'; // Actually using base entity for id/created_at
import { Payout } from './payout.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('payout_items')
export class PayoutItem { // Not extending BaseEntity because schema only has created_at, no update/metadata if strict. But schema has id.
    @Column({ primary: true, type: 'uuid', generated: 'uuid' })
    id: string;

    @Column({ type: 'uuid' })
    payout_id: string;

    @ManyToOne(() => Payout, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'payout_id' })
    payout: Payout;

    @Column({ type: 'uuid' })
    order_id: string;

    @ManyToOne(() => Order)
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ type: 'char', length: 3 })
    currency_code: string;

    @Column({ type: 'int' })
    gross_amount_minor: number;

    @Column({ type: 'int' })
    commission_amount_minor: number;

    @Column({ type: 'int', default: 0 })
    fee_amount_minor: number;

    @Column({
        type: 'int',
        generatedType: 'STORED',
        asExpression: 'gross_amount_minor - commission_amount_minor - fee_amount_minor',
    })
    net_amount_minor: number;

    @Column({ type: 'timestamptz', default: () => 'NOW()' })
    created_at: Date;
}
