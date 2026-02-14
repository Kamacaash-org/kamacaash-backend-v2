import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, DeepPartial } from 'typeorm';
import { BusinessCategory } from './entities/business-category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(BusinessCategory)
        private categoriesRepository: TreeRepository<BusinessCategory>,
    ) { }

    private async getCategoryByIdOrThrow(id: string): Promise<BusinessCategory> {
        const category = await this.categoriesRepository.findOne({ where: { id } });
        if (!category) throw new NotFoundException(`${DEFAULT_MESSAGES.CATEGORY.NOT_FOUND}: ${id}`);
        return category;
    }

    async findAll(): Promise<ApiResponseDto<CategoryResponseDto[]>> {
        const categories = await this.categoriesRepository.findTrees();
        return ApiResponseDto.success(
            DEFAULT_MESSAGES.CATEGORY.LIST_FETCHED,
            categories.map((category) => CategoryResponseDto.fromEntity(category, true)),
        );
    }

    async findOne(id: string): Promise<ApiResponseDto<CategoryResponseDto>> {
        const category = await this.getCategoryByIdOrThrow(id);
        return ApiResponseDto.success(
            DEFAULT_MESSAGES.CATEGORY.FETCHED,
            CategoryResponseDto.fromEntity(category, false),
        );
    }

    async findBySlug(slug: string): Promise<ApiResponseDto<CategoryResponseDto>> {
        const category = await this.categoriesRepository.findOne({ where: { slug } });
        if (!category) throw new NotFoundException(`${DEFAULT_MESSAGES.CATEGORY.NOT_FOUND}: ${slug}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.CATEGORY.FETCHED,
            CategoryResponseDto.fromEntity(category, false),
        );
    }

    async create(createCategoryDto: CreateCategoryDto): Promise<ApiResponseDto<CategoryResponseDto>> {
        const category: BusinessCategory = this.categoriesRepository.create({
            ...createCategoryDto,
            country_code: createCategoryDto.country_code.toUpperCase(),
        } as DeepPartial<BusinessCategory>);

        if (createCategoryDto.parent_id) {
            category.parent = await this.getCategoryByIdOrThrow(createCategoryDto.parent_id);
        }

        const created = await this.categoriesRepository.save(category);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.CATEGORY.CREATED,
            CategoryResponseDto.fromEntity(created, false),
        );
    }

    async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<ApiResponseDto<CategoryResponseDto>> {
        const category = await this.getCategoryByIdOrThrow(id);
        const updated: BusinessCategory = this.categoriesRepository.merge(category, {
            ...updateCategoryDto,
            country_code: updateCategoryDto.country_code?.toUpperCase(),
        });

        if (updateCategoryDto.parent_id) {
            updated.parent = await this.getCategoryByIdOrThrow(updateCategoryDto.parent_id);
        }

        const saved = await this.categoriesRepository.save(updated);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.CATEGORY.UPDATED,
            CategoryResponseDto.fromEntity(saved, false),
        );
    }

    async remove(id: string): Promise<ApiResponseDto<{ id: string }>> {
        await this.getCategoryByIdOrThrow(id);
        await this.categoriesRepository.delete(id);

        return ApiResponseDto.success(DEFAULT_MESSAGES.CATEGORY.DELETED, { id });
    }
}
