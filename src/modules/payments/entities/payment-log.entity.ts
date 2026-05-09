import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Payment } from './payment.entity';
import { PaymentLogType } from '../../../common/entities/enums/all.enums';

@Entity('payment_logs')
@Index(['payment_id', 'type'])
export class PaymentLog extends BaseEntity {
    @Column({ type: 'uuid' })
    payment_id!: string;

    @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'payment_id' })
    payment!: Payment;

    @Column({ type: 'enum', enum: PaymentLogType })
    type!: PaymentLogType;

    @Column({ type: 'varchar', length: 255, nullable: true })
    endpoint!: string;

    @Column({ type: 'jsonb', nullable: true })
    request_payload!: Record<string, any> | null;

    @Column({ type: 'jsonb', nullable: true })
    response_payload!: Record<string, any> | null;

    @Column({ type: 'int', nullable: true })
    status_code!: number | null;

    @Column({ type: 'text', nullable: true })
    error_message!: string | null;
}
