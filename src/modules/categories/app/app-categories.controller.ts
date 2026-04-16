import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from '../categories.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';

@ApiTags('app/categories')
@Controller('app/categories')
export class AppCategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    @ApiOperation({ summary: 'List categories for app' })
    findAllForApp(): Promise<ApiResponseDto<any[]>> {
        return this.categoriesService.findAllForApp();
    }
}
