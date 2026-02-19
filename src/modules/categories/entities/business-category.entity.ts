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
import { BaseEntity } from '../../../common/entities/base.entity';
import { Country } from '../../countries/entities/country.entity';

@Entity('business_categories')
@Tree('materialized-path')
export class BusinessCategory extends BaseEntity {
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

    @Column({ default: true })
    is_active: boolean;

    @Column({ default: false })
    is_featured: boolean;
}
