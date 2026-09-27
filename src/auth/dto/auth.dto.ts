import { Transform } from 'class-transformer';
import {
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class LoginUserDto {
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(30)
    username!: string;

    @IsString()
    @MinLength(8)
    @MaxLength(72)
    @Matches(/\S/)
    password!: string;
}

export class SignupUserDto extends LoginUserDto {
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    fullname!: string;
}

export class UserDto {
    id!: number;
    username!: string;
    fullname!: string;
}

export class StoredUserDto extends UserDto {
    passwordHash!: string;
    refreshTokenHash?: string;
}

export class AuthTokensDto {
    user!: UserDto;
    accessToken!: string;
    refreshToken!: string;
}

export class TokenPayloadDto {
    sub!: number;
    username!: string;
    type!: 'access' | 'refresh';
    iat?: number;
    exp?: number;
    jti?: string;
}