import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, DeepPartial } from 'typeorm';
import { BusinessCategory } from './entities/business-category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DEFAULT_MESSAGES } from '../../common/constants/default-messages';
import { S3UploadService } from '../../common/services/s3-upload.service';
import { UploadedFile } from '../../common/types/uploaded-file.type';
import { getDdlOptions } from '../../utils/ddl.util';

type CategoryUploadFiles = {
    icon_url?: UploadedFile[];
    image_url?: UploadedFile[];
};

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(BusinessCategory)
        private categoriesRepository: TreeRepository<BusinessCategory>,
        private readonly s3UploadService: S3UploadService,
    ) { }

    private async getCategoryByIdOrThrow(id: string): Promise<BusinessCategory> {
        const category = await this.categoriesRepository.findOne({ where: { id, is_archived: false } });
        if (!category) throw new NotFoundException(`${DEFAULT_MESSAGES.CATEGORY.NOT_FOUND}: ${id}`);
        return category;
    }

    async findAll(): Promise<ApiResponseDto<CategoryResponseDto[]>> {
        const categories = await this.categoriesRepository.find({
            where: { is_archived: false },
        });
        return ApiResponseDto.success(
            DEFAULT_MESSAGES.CATEGORY.LIST_FETCHED,
            categories.map((category) => CategoryResponseDto.fromEntity(category, true)),
        );
    }

    async getCategoriesDdl() {
        const ddl = await getDdlOptions(this.categoriesRepository, {
            where: { is_archived: false, is_active: true },
            select: {
                id: true,
                name: true,
                slug: true,
            },
            labelKey: 'name',
            valueKey: 'id',
            metaKeys: ['slug'],
            order: { sort_order: 'ASC' },
        });

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.CATEGORY.DDL_CATEGORIES_FETCHED,
            ddl,
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
        const category = await this.categoriesRepository.findOne({ where: { slug, is_archived: false } });
        if (!category) throw new NotFoundException(`${DEFAULT_MESSAGES.CATEGORY.NOT_FOUND}: ${slug}`);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.CATEGORY.FETCHED,
            CategoryResponseDto.fromEntity(category, false),
        );
    }

    async create(
        createCategoryDto: CreateCategoryDto,
        currentUser: any,
        files?: CategoryUploadFiles,
    ): Promise<ApiResponseDto<CategoryResponseDto>> {

        const countryCodeFromToken = currentUser.country_code;
        const created_by = currentUser.id;
        const fileUpdates = await this.buildCategoryFileUpdates(files);
        const { oldUrlsToDelete: _unusedOldUrls, ...uploadedFileFields } = fileUpdates;

        const category: BusinessCategory = this.categoriesRepository.create({
            ...createCategoryDto,
            ...uploadedFileFields,
            country_code: countryCodeFromToken,
            created_by,
        } as DeepPartial<BusinessCategory>);

        if (createCategoryDto.parent_id) {
            category.parent = await this.getCategoryByIdOrThrow(
                createCategoryDto.parent_id,
            );
        }

        const created = await this.categoriesRepository.save(category);

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.CATEGORY.CREATED,
            CategoryResponseDto.fromEntity(created, false),
        );
    }
    async update(
        id: string,
        updateCategoryDto: UpdateCategoryDto,
        currentUser: any,
        files?: CategoryUploadFiles,
    ): Promise<ApiResponseDto<CategoryResponseDto>> {

        const updated_by = currentUser.id;
        const countryCodeFromToken = currentUser.country_code;

        const category = await this.getCategoryByIdOrThrow(id);
        const fileUpdates = await this.buildCategoryFileUpdates(files, category);
        const { oldUrlsToDelete, ...uploadedFileFields } = fileUpdates;

        const updated: BusinessCategory = this.categoriesRepository.merge(
            category,
            {
                ...updateCategoryDto,
                ...uploadedFileFields,
                country_code: countryCodeFromToken,
                updated_by,
            },
        );

        if (updateCategoryDto.parent_id) {
            updated.parent = await this.getCategoryByIdOrThrow(
                updateCategoryDto.parent_id,
            );
        }

        const saved = await this.categoriesRepository.save(updated);
        if (oldUrlsToDelete.length) {
            await this.s3UploadService.deleteManyByUrls(oldUrlsToDelete);
        }

        return ApiResponseDto.success(
            DEFAULT_MESSAGES.CATEGORY.UPDATED,
            CategoryResponseDto.fromEntity(saved, false),
        );
    }

    async remove(id: string, currentUser: any): Promise<ApiResponseDto<{ id: string }>> {

        const category = await this.categoriesRepository.findOne({
            where: {
                id,
                country_code: currentUser.country_code,
                is_archived: false,
            },
        });

        if (!category) {
            throw new NotFoundException(`${DEFAULT_MESSAGES.CATEGORY.NOT_FOUND}: ${id}`);
        }

        category.is_archived = true;
        category.archived_by = currentUser.id;
        category.archived_at = new Date();

        await this.categoriesRepository.save(category);

        return ApiResponseDto.success(DEFAULT_MESSAGES.CATEGORY.DELETED, { id });
    }

    private async buildCategoryFileUpdates(
        files?: CategoryUploadFiles,
        existingCategory?: BusinessCategory,
    ): Promise<{
        icon_url?: string;
        image_url?: string;
        oldUrlsToDelete: string[];
    }> {
        const oldUrlsToDelete: string[] = [];
        const updates: {
            icon_url?: string;
            image_url?: string;
            oldUrlsToDelete: string[];
        } = { oldUrlsToDelete };

        const icon = files?.icon_url?.[0];
        if (icon) {
            updates.icon_url = await this.s3UploadService.uploadFile(icon, 'categories/icons');
            if (existingCategory?.icon_url) oldUrlsToDelete.push(existingCategory.icon_url);
        }

        const image = files?.image_url?.[0];
        if (image) {
            updates.image_url = await this.s3UploadService.uploadFile(image, 'categories/images');
            if (existingCategory?.image_url) oldUrlsToDelete.push(existingCategory.image_url);
        }

        return updates;
    }
}
