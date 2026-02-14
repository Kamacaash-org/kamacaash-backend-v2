import { Controller, Post, Get, Param, UseGuards, Request } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
    constructor(private readonly favoritesService: FavoritesService) { }

    @Post(':businessId')
    @ApiOperation({ summary: 'Toggle favorite business' })
    toggle(@Param('businessId') businessId: string, @Request() req) {
        return this.favoritesService.toggle(req.user.id, businessId);
    }

    @Get()
    @ApiOperation({ summary: 'List user favorites' })
    findAll(@Request() req) {
        return this.favoritesService.findAll(req.user.id);
    }
}
