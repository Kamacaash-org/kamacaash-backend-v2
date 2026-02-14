import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    @ApiOperation({ summary: 'List all categories (tree)' })
    findAll(): Promise<ApiResponseDto<CategoryResponseDto[]>> {
        return this.categoriesService.findAll();
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Get category by slug' })
    findBySlug(@Param('slug') slug: string): Promise<ApiResponseDto<CategoryResponseDto>> {
        return this.categoriesService.findBySlug(slug);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get category by ID' })
    findOne(@Param('id') id: string): Promise<ApiResponseDto<CategoryResponseDto>> {
        return this.categoriesService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create category (Admin)' })
    create(@Body() createCategoryDto: CreateCategoryDto): Promise<ApiResponseDto<CategoryResponseDto>> {
        return this.categoriesService.create(createCategoryDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update category (Admin)' })
    update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto): Promise<ApiResponseDto<CategoryResponseDto>> {
        return this.categoriesService.update(id, updateCategoryDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete category (Admin)' })
    remove(@Param('id') id: string): Promise<ApiResponseDto<{ id: string }>> {
        return this.categoriesService.remove(id);
    }
}
