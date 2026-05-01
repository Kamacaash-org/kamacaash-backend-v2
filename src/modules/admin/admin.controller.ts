import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/entities/enums/all.enums';
import {
    AdminDashboardFinanceDto,
    AdminDashboardOperationsDto,
    AdminDashboardOverviewDto,
    AdminDashboardRecentActivityDto,
    AdminDashboardStatsDto,
} from './dto/admin-dashboard-response.dto';

@ApiTags('admin/dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get()
    @ApiOperation({ summary: 'Get full super admin dashboard stats' })
    getDashboardStats(): Promise<AdminDashboardStatsDto> {
        return this.adminService.getDashboardStats();
    }

    @Get('overview')
    @ApiOperation({ summary: 'Get super admin dashboard overview metrics' })
    getOverview(): Promise<AdminDashboardOverviewDto> {
        return this.adminService.getOverview();
    }

    @Get('finance')
    @ApiOperation({ summary: 'Get super admin dashboard finance metrics' })
    getFinance(): Promise<AdminDashboardFinanceDto> {
        return this.adminService.getFinance();
    }

    @Get('operations')
    @ApiOperation({ summary: 'Get super admin dashboard operations metrics' })
    getOperations(): Promise<AdminDashboardOperationsDto> {
        return this.adminService.getOperations();
    }

    @Get('recent-activity')
    @ApiOperation({ summary: 'Get super admin recent dashboard activity' })
    getRecentActivity(): Promise<AdminDashboardRecentActivityDto> {
        return this.adminService.getRecentActivity();
    }
}
