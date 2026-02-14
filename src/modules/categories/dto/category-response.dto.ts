import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessCategory } from '../entities/business-category.entity';

export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  country_code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  icon_url?: string;

  @ApiPropertyOptional()
  image_url?: string;

  @ApiPropertyOptional()
  parent_id?: string;

  @ApiProperty()
  sort_order: number;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  is_featured: boolean;

  @ApiProperty({ type: [CategoryResponseDto], required: false })
  children?: CategoryResponseDto[];

  @ApiProperty({ type: Object })
  metadata: Record<string, any>;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  static fromEntity(category: BusinessCategory, includeChildren = true): CategoryResponseDto {
    return {
      id: category.id,
      country_code: category.country_code,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon_url: category.icon_url,
      image_url: category.image_url,
      parent_id: category.parent?.id,
      sort_order: category.sort_order,
      is_active: category.is_active,
      is_featured: category.is_featured,
      children: includeChildren && Array.isArray(category.children)
        ? category.children.map((child) => CategoryResponseDto.fromEntity(child, true))
        : undefined,
      metadata: category.metadata,
      created_at: category.created_at,
      updated_at: category.updated_at,
    };
  }
}
