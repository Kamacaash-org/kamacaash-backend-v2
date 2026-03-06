import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '../../common/types/uploaded-file.type';

type CategoryUploadFiles = {
    icon_url?: UploadedFile[];
    image_url?: UploadedFile[];
};

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    @ApiOperation({ summary: 'List all categories (tree)' })
    findAll(): Promise<ApiResponseDto<CategoryResponseDto[]>> {
        return this.categoriesService.findAll();
    }

    @Get('ddl')
    @ApiOperation({ summary: 'List all categories (DDL)' })
    getCategoriesDdl(): Promise<ApiResponseDto<any>> {
        return this.categoriesService.getCategoriesDdl();
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

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'icon_url', maxCount: 1 },
            { name: 'image_url', maxCount: 1 },
        ]),
    )
    @Post()
    @ApiOperation({ summary: 'Create category (Admin)' })
    create(
        @Body() createCategoryDto: CreateCategoryDto,
        @UploadedFiles() files: CategoryUploadFiles,
        @Request() req,
    ): Promise<ApiResponseDto<CategoryResponseDto>> {
        return this.categoriesService.create(createCategoryDto, req.user, files);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'icon_url', maxCount: 1 },
            { name: 'image_url', maxCount: 1 },
        ]),
    )
    @Put(':id')
    @ApiOperation({ summary: 'Update category (Admin)' })
    update(
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
        @UploadedFiles() files: CategoryUploadFiles,
        @Request() req,
    ): Promise<ApiResponseDto<CategoryResponseDto>> {
        return this.categoriesService.update(id, updateCategoryDto, req.user, files);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Delete(':id')
    @ApiOperation({ summary: 'Delete category (Admin)' })
    remove(@Param('id') id: string, @Request() req): Promise<ApiResponseDto<{ id: string }>> {
        return this.categoriesService.remove(id, req.user);
    }
}
