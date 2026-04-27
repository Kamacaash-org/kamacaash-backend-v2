import {
    Controller,
    Get,
    Post,
    Body,
    Put,
    Request,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiOkResponse } from '@nestjs/swagger';
import {
    RegisterAppUserDto,
    VerifyAppUserDto,
    ResendOtpDto,
    UpdateAppUserProfileDto,
} from './dto/app-user-auth.dto';
import { AppUserProfileResponseDto } from './dto/app-user-profile-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '../../../common/types/uploaded-file.type';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';

type ProfileUploadFiles = {
    profile_image_url?: UploadedFile[];
};

@ApiTags('app/users')
@Controller('app/users')
export class AppUsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register/Login app user (Request OTP)' })
    register(@Body() registerDto: RegisterAppUserDto) {
        return this.usersService.registerFromApp(registerDto);
    }

    @Post('verify-otp')
    @ApiOperation({ summary: 'Verify app user OTP' })
    verifyOtp(@Body() verifyDto: VerifyAppUserDto) {
        return this.usersService.verifyOtpFromApp(verifyDto);
    }

    @Post('resend-otp')
    @ApiOperation({ summary: 'Resend app OTP' })
    resendOtp(@Body() resendDto: ResendOtpDto) {
        return this.usersService.resendOtpFromApp(resendDto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('profile')
    @ApiOperation({ summary: 'Get app user profile' })
    @ApiOkResponse({ type: AppUserProfileResponseDto })
    getProfile(@Request() req): Promise<ApiResponseDto<{ user: AppUserProfileResponseDto }>> {
        return this.usersService.getProfileFromApp(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(FileFieldsInterceptor([{ name: 'profile_image_url', maxCount: 1 }]))
    @Put('profile')
    @ApiConsumes('multipart/form-data', 'application/json')
    @ApiOperation({ summary: 'Update app user profile' })
    @ApiOkResponse({ type: AppUserProfileResponseDto })
    updateProfile(
        @Body() updateDto: UpdateAppUserProfileDto,
        @Request() req,
        @UploadedFiles() files: ProfileUploadFiles,
    ): Promise<ApiResponseDto<{ user: AppUserProfileResponseDto }>> {
        return this.usersService.updateProfileFromApp(req.user.id, updateDto, files);
    }
}
