import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRegisterDto, UserVerifyDto } from './dto/user-auth.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { AuthOtpRequestResponseDto, AuthVerifyResponseDto, AuthProfileResponseDto } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('user/register')
    @ApiOperation({ summary: 'Register/Login mobile user (Request OTP)' })
    registerUser(@Body() registerDto: UserRegisterDto): Promise<ApiResponseDto<AuthOtpRequestResponseDto>> {
        return this.authService.requestPhoneOtp(registerDto);
    }

    @Post('user/verify')
    @ApiOperation({ summary: 'Verify mobile user OTP' })
    verifyUser(@Body() verifyDto: UserVerifyDto): Promise<ApiResponseDto<AuthVerifyResponseDto>> {
        return this.authService.verifyPhoneOtp(verifyDto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile' })
    getProfile(@Request() req): Promise<ApiResponseDto<AuthProfileResponseDto>> {
        return this.authService.getProfile(req.user);
    }
}
