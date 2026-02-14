import {
    Controller,
    Get,
    Post,
    Body,
    Put,
    Param,
    Delete,
    Query,
    Patch,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StaffVerify2faDto } from './dto/staff-verify-2fa.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { StaffResponseDto } from './dto/staff-response.dto';
import {
  StaffLogin2faRequiredResponseDto,
  StaffSessionResponseDto,
} from './dto/staff-auth-response.dto';
import { ApproveStaffDto } from './dto/approve-staff.dto';

@ApiTags('staff')
@Controller('staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Post('login')
    @ApiOperation({ summary: 'Staff login' })
    login(@Body() loginDto: StaffLoginDto): Promise<ApiResponseDto<StaffSessionResponseDto | StaffLogin2faRequiredResponseDto>> {
        return this.staffService.login(loginDto);
    }

    @Post('verify-2fa')
    @ApiOperation({ summary: 'Verify Staff 2FA' })
    verify2fa(@Body() verifyDto: StaffVerify2faDto): Promise<ApiResponseDto<StaffSessionResponseDto>> {
        return this.staffService.verify2fa(verifyDto);
    }

    @Post()
    @ApiOperation({ summary: 'Create staff user' })
    create(@Body() createStaffDto: CreateStaffDto): Promise<ApiResponseDto<StaffResponseDto>> {
        return this.staffService.create(createStaffDto);
    }

    @Get()
    @ApiOperation({ summary: 'List staff users' })
    findAll(@Query() paginationDto: PaginationDto): Promise<ApiResponseDto<StaffResponseDto[]>> {
        return this.staffService.findAll(paginationDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get staff by ID' })
    findOne(@Param('id') id: string): Promise<ApiResponseDto<StaffResponseDto>> {
        return this.staffService.findOne(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update staff user' })
    update(@Param('id') id: string, @Body() updateStaffDto: UpdateStaffDto): Promise<ApiResponseDto<StaffResponseDto>> {
        return this.staffService.update(id, updateStaffDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete staff user' })
    remove(@Param('id') id: string): Promise<ApiResponseDto<{ id: string }>> {
        return this.staffService.remove(id);
    }

    @Patch(':id/approve')
    @ApiOperation({ summary: 'Approve staff user' })
    approve(@Param('id') id: string, @Body() approveStaffDto: ApproveStaffDto): Promise<ApiResponseDto<StaffResponseDto>> {
        return this.staffService.approve(id, approveStaffDto.approverId);
    }

    @Patch(':id/disable')
    @ApiOperation({ summary: 'Disable staff user' })
    disable(@Param('id') id: string): Promise<ApiResponseDto<StaffResponseDto>> {
        return this.staffService.disable(id);
    }
}
