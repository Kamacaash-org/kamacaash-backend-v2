import {
    Entity,
    Column,
    Index,
    ManyToOne,
    JoinColumn,
    Tree,
    TreeChildren,
    TreeParent,
} from 'typeorm';
import { BaseEntity, BaseSoftDeleteEntity } from '../../../common/entities/base.entity';
import { Country } from '../../countries/entities/country.entity';
import { StaffUser } from 'src/modules/staff/entities/staff-user.entity';

@Entity('business_categories')
@Tree('materialized-path')
export class BusinessCategory extends BaseSoftDeleteEntity {
    @Column({ type: 'char', length: 2 })
    country_code: string;

    @ManyToOne(() => Country)
    @JoinColumn({ name: 'country_code', referencedColumnName: 'iso_code_3166' })
    country: Country;

    @Column({ length: 100 })
    name: string;

    @Column({ length: 100 })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    icon_url: string;

    @Column({ type: 'text', nullable: true })
    image_url: string;

    @TreeParent()
    parent: BusinessCategory;

    @TreeChildren()
    children: BusinessCategory[];

    @Column({ type: 'int', default: 0 })
    sort_order: number;


    @Column({ type: 'uuid', nullable: true })
    created_by: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'created_by' })
    creator: StaffUser;


    @Column({ type: 'uuid', nullable: true })
    updated_by: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'updated_by' })
    updater: StaffUser;

    @Column({ default: false })
    is_archived: boolean;

    @Column({ type: 'uuid', nullable: true })
    archived_by: string;

    @ManyToOne(() => StaffUser)
    @JoinColumn({ name: 'archived_by' })
    archiver: StaffUser;

    @Column({ type: 'timestamptz', nullable: true })
    archived_at: Date;

    @Column({ default: true })
    is_active: boolean;

    @Column({ default: false })
    is_featured: boolean;
}
