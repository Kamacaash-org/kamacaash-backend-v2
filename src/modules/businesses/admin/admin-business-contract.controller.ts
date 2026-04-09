import { Controller, Get, Param, Post, Request, UseGuards, UseInterceptors, UploadedFiles, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { BusinessContractService } from '../BusinessContract.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '../../../common/types/uploaded-file.type';
import {
    ContractBusinessShortDto,
    SignedBusinessContractResponseDto,
    UploadContractDto,
    UploadContractResponseDto,
} from '../dto/business-contract.dto';

type ContractUploadFiles = {
    contractDocument?: UploadedFile[];
};

@ApiTags('admin/business-contracts')
@Controller('admin/business-contracts')
export class AdminBusinessContractController {
    constructor(private readonly contractService: BusinessContractService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('without-contract')
    @ApiOperation({ summary: 'Get businesses without contract' })
    getBusinessWithNoContract(): Promise<ApiResponseDto<ContractBusinessShortDto[]>> {
        return this.contractService.getBusinessWithNoContract();
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('with-contract')
    @ApiOperation({ summary: 'Get businesses with contract' })
    getBusinessWithContract(): Promise<ApiResponseDto<SignedBusinessContractResponseDto[]>> {
        return this.contractService.getBusinessWithContract();
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(
        FileFieldsInterceptor([{ name: 'contractDocument', maxCount: 1 }]),
    )
    @Post(':businessId/upload-contract')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload contract document and create signed contract entry' })
    uploadContract(
        @Param('businessId') businessId: string,
        @Body() dto: UploadContractDto,
        @UploadedFiles() files: ContractUploadFiles,
        @Request() req,
    ): Promise<ApiResponseDto<UploadContractResponseDto>> {
        const ip = req.ip || req.connection.remoteAddress;
        return this.contractService.uploadContract(
            businessId,
            dto,
            req.user,
            ip,
            files?.contractDocument?.[0],
        );
    }
}
