import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { StaffUser } from '../../staff/entities/staff-user.entity';
import { Country } from '../../countries/entities/country.entity';

@Entity('cities')
@Unique(['country_id', 'name'])
export class City extends BaseEntity {
    @Column({ length: 100 })
    name!: string;

    @Column({ length: 100, nullable: true })
    native_name?: string;

    @Column({ type: 'uuid' })
    country_id!: string;

    @ManyToOne(() => Country)
    @JoinColumn({ name: 'country_id', referencedColumnName: 'id' })
    country!: Country;

    @Column({ length: 50, nullable: true })
    timezone?: string;

    @Column({ type: 'jsonb', nullable: true })
    location?: {
        latitude: number;
        longitude: number;
    };

    @Column({ default: true })
    is_active!: boolean;

    @Column({ default: false })
    is_archived!: boolean;

    @Column({ type: 'uuid', nullable: true })
    created_by?: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'created_by' })
    creator?: StaffUser;

    @Column({ type: 'uuid', nullable: true })
    updated_by?: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'updated_by' })
    updater?: StaffUser;
}
