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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import {
    RegisterAppUserDto,
    VerifyAppUserDto,
    ResendOtpDto,
    UpdateAppUserProfileDto,
} from './dto/app-user-auth.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '../../../common/types/uploaded-file.type';

type ProfileUploadFiles = {
    profile_image_url?: UploadedFile[];
};

@ApiTags('app/users')
@Controller('app/users')
export class AppUsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register/Login mobile user (Request OTP)' })
    register(@Body() registerDto: RegisterAppUserDto) {
        return this.usersService.registerFromMobile(registerDto);
    }

    @Post('verify-otp')
    @ApiOperation({ summary: 'Verify mobile user OTP' })
    verifyOtp(@Body() verifyDto: VerifyAppUserDto) {
        return this.usersService.verifyOtpFromMobile(verifyDto);
    }

    @Post('resend-otp')
    @ApiOperation({ summary: 'Resend Mobile OTP' })
    resendOtp(@Body() resendDto: ResendOtpDto) {
        return this.usersService.resendOtpFromMobile(resendDto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('profile')
    @ApiOperation({ summary: 'Get mobile user profile' })
    getProfile(@Request() req) {
        return this.usersService.getProfileFromMobile(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(FileFieldsInterceptor([{ name: 'profile_image_url', maxCount: 1 }]))
    @Put('profile')
    @ApiConsumes('multipart/form-data', 'application/json')
    @ApiOperation({ summary: 'Update mobile user profile' })
    updateProfile(
        @Body() updateDto: UpdateAppUserProfileDto,
        @Request() req,
        @UploadedFiles() files: ProfileUploadFiles,
    ) {
        return this.usersService.updateProfileFromMobile(req.user.id, updateDto, files);
    }
}
