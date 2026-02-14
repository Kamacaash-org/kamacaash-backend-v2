import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCountryDto } from './create-country.dto';

export class UpdateCountryDto extends PartialType(
  OmitType(CreateCountryDto, ['iso_code_3166'] as const),
) {}
