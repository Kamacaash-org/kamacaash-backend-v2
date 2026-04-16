import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FavoriteSource } from '../../../../common/entities/enums/all.enums';

export class AddBusinessFavoriteDto {
  @ApiPropertyOptional({
    enum: FavoriteSource,
    example: FavoriteSource.MANUAL,
    description: 'How the favorite was created.',
  })
  @IsOptional()
  @IsEnum(FavoriteSource)
  source?: FavoriteSource;

  @ApiPropertyOptional({
    description: 'Optional user note for this favorite.',
    example: 'Try their lunch offers',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
