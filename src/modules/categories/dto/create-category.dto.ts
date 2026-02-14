import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ minLength: 2, maxLength: 2, example: 'US' })
  @IsString()
  @Length(2, 2)
  country_code: string;

  @ApiProperty({ example: 'Bakery' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ example: 'bakery' })
  @IsString()
  @Length(1, 100)
  slug: string;

  @ApiPropertyOptional({ example: 'Fresh baked goods' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/icon.svg' })
  @IsOptional()
  @IsString()
  icon_url?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/image.jpg' })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional({ example: 'parent-category-uuid' })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;
}
