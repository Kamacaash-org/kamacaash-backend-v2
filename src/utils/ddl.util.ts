import { DdlOptionDto } from '../common/dto/ddl-option.dto';
import { Repository, FindOptionsWhere, FindOptionsSelect, ObjectLiteral } from 'typeorm';

export async function getDdlOptions<T>(
    repository: Repository<T extends ObjectLiteral ? T : never>,
    options: {
        where?: FindOptionsWhere<T extends ObjectLiteral ? T : never>;
        select?: FindOptionsSelect<T extends ObjectLiteral ? T : never>;
        labelKey?: keyof T;
        valueKey?: keyof T;
        metaKeys?: (keyof T)[];
        order?: any;
    },
): Promise<DdlOptionDto[]> {
    const {
        where = {},
        select,
        labelKey = 'name' as keyof T,
        valueKey = 'id' as keyof T,
        metaKeys = [],
        order,
    } = options;

    const records = await repository.find({
        where,
        select,
        order,
    });

    return records.map((record: any) => {
        const meta: any = {};

        metaKeys.forEach((key) => {
            meta[key as string] = record[key];
        });

        return {
            label: record[labelKey],
            value: record[valueKey],
            meta: Object.keys(meta).length ? meta : undefined,
        };
    });
}