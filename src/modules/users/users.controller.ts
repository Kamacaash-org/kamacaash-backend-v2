import {
    Controller,
    Get,
    Body,
    Param,
    Delete,
    Query,
    Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserStatus } from '../../common/entities/enums/all.enums';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }


    @Get()
    @ApiOperation({ summary: 'List all users' })
    findAll(@Query() paginationDto: PaginationDto) {
        return this.usersService.findAll(paginationDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }


    @Delete(':id')
    @ApiOperation({ summary: 'Soft delete user' })
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update user status' })
    updateStatus(@Param('id') id: string, @Body('status') status: UserStatus) {
        return this.usersService.updateStatus(id, status);
    }
}
