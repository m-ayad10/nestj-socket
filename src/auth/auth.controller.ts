import {
    Body,
    Controller,
    Post,
    Req,
    Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginUserDto, SignupUserDto } from './dto/auth.dto.js';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('signup')
    async signUp(
        @Body() body: SignupUserDto,
        @Res({ passthrough: true }) response: Response,
    ) {
        const tokens = await this.authService.signUpUser(body);
        this.setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
        return { success: true, user: tokens.user };
    }

    @Post('login')
    async login(
        @Body() body: LoginUserDto,
        @Res({ passthrough: true }) response: Response,
    ) {
        const tokens = await this.authService.loginUser(body);
        this.setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
        return { success: true, user: tokens.user };
    }

    @Post('refresh')
    async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
        try {
            const tokens = await this.authService.refreshTokens(
                request.cookies?.[REFRESH_COOKIE],
            );
            this.setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
            return { success: true, user: tokens.user };
        } catch (error) {
            this.clearAuthCookies(response);
            throw error;
        }
    }

    private setAuthCookies(
        response: Response,
        accessToken: string,
        refreshToken: string,
    ): void {
        const secure = process.env.NODE_ENV === 'production';
        response.cookie(ACCESS_COOKIE, accessToken, {
            httpOnly: true,
            secure,
            sameSite: 'lax',
            path: '/',
            maxAge: ACCESS_TOKEN_MAX_AGE,
        });
        response.cookie(REFRESH_COOKIE, refreshToken, {
            httpOnly: true,
            secure,
            sameSite: 'lax',
            path: '/auth/refresh',
            maxAge: REFRESH_TOKEN_MAX_AGE,
        });
    }

    private clearAuthCookies(response: Response): void {
        const secure = process.env.NODE_ENV === 'production';
        response.clearCookie(ACCESS_COOKIE, {
            httpOnly: true,
            secure,
            sameSite: 'lax',
            path: '/',
        });
        response.clearCookie(REFRESH_COOKIE, {
            httpOnly: true,
            secure,
            sameSite: 'lax',
            path: '/auth/refresh',
        });
    }
}
