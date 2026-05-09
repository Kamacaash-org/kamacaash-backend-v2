import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Payment } from './payment.entity';
import { PaymentEventType, PaymentStatus } from '../../../common/entities/enums/all.enums';

@Entity('payment_events')
@Index(['payment_id', 'type'])
export class PaymentEvent extends BaseEntity {
    @Column({ type: 'uuid' })
    payment_id!: string;

    @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'payment_id' })
    payment!: Payment;

    @Column({ type: 'enum', enum: PaymentEventType })
    type!: PaymentEventType;

    @Column({ type: 'enum', enum: PaymentStatus })
    status!: PaymentStatus;

    @Column({ type: 'text', nullable: true })
    note!: string | null;

    @Column({ type: 'jsonb', nullable: true })
    payload!: Record<string, any> | null;
}
