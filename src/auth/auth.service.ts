import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
    AuthTokensDto,
    LoginUserDto,
    SignupUserDto,
    StoredUserDto,
    TokenPayloadDto,
    UserDto,
} from './dto/auth.dto.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {

    private id=0
    private readonly usersFile = resolve(
        process.cwd(),
        'assets',
        'users.json',
    );

    constructor(private readonly jwtService: JwtService) {
        if (process.env.NODE_ENV === 'production') {
            this.getAccessSecret();
            this.getRefreshSecret();
        }
    }

    async signUpUser(body: SignupUserDto): Promise<AuthTokensDto> {
        const users = await this.readUsers();
        const username = this.normalizeUsername(body.username);
        if (users.some((user) => this.normalizeUsername(user.username) === username)) {
            throw new ConflictException('Username is already registered');
        }

        const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
        const user = new StoredUserDto();
        user.id = ++this.id;
        user.username = username;
        user.fullname = username;
        user.passwordHash = passwordHash;

        const tokens = await this.issueTokens(user);
        users.push(user);
        await this.writeUsers(users);
        return tokens;
    }

    async loginUser(body: LoginUserDto): Promise<AuthTokensDto> {
        const users = await this.readUsers();
        const user = users.find(
            (storedUser) =>
                this.normalizeUsername(storedUser.username) ===
                this.normalizeUsername(body.username),
        );
        if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
            throw new UnauthorizedException('Invalid username or password');
        }
        const tokens = await this.issueTokens(user);
        await this.writeUsers(users);
        return tokens;
    }

    async refreshTokens(refreshToken: string | undefined): Promise<AuthTokensDto> {
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token is required');
        }

        let payload: TokenPayloadDto;
        try {
            payload = await this.jwtService.verifyAsync<TokenPayloadDto>(refreshToken, {
                secret: this.getRefreshSecret(),
                algorithms: ['HS256'],
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        if (payload.type !== 'refresh') {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const users = await this.readUsers();
        const user = users.find((storedUser) => storedUser.id === payload.sub);
        const activeHash = user?.refreshTokenHash;
        if (
            !user ||
            !activeHash ||
            !(await bcrypt.compare(this.hashToken(refreshToken), activeHash)) ||
            user.refreshTokenHash !== activeHash
        ) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const tokens = await this.issueTokens(user);
        await this.writeUsers(users);
        return tokens;
    }

    private async issueTokens(user: StoredUserDto): Promise<AuthTokensDto> {
        const claims = { sub: user.id, username: user.username };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                {
                    ...claims,
                    type: 'access',
                    jti: randomUUID(),
                },
                {
                    secret: this.getAccessSecret(),
                    algorithm: 'HS256',
                    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
                },
            ),
            this.jwtService.signAsync(
                {
                    ...claims,
                    type: 'refresh',
                    jti: randomUUID(),
                },
                {
                    secret: this.getRefreshSecret(),
                    algorithm: 'HS256',
                    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
                },
            ),
        ]);

        user.refreshTokenHash = await bcrypt.hash(
            this.hashToken(refreshToken),
            BCRYPT_ROUNDS,
        );
        return {
            user: this.toPublicUser(user),
            accessToken,
            refreshToken,
        };
    }

    private toPublicUser(user: StoredUserDto): UserDto {
        return {
            id: user.id,
            username: user.username,
            fullname: user.fullname,
        };
    }

    private normalizeUsername(username: string): string {
        return username.trim().toLowerCase();
    }

    private async readUsers(): Promise<StoredUserDto[]> {
        const contents = await readFile(this.usersFile, 'utf8');
        const users = JSON.parse(contents) as StoredUserDto[];
        return users.map((user) => Object.assign(new StoredUserDto(), user));
    }

    private async writeUsers(users: StoredUserDto[]): Promise<void> {
        await writeFile(this.usersFile, `${JSON.stringify(users, null, 2)}\n`, 'utf8');
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private getAccessSecret(): string {
        return this.getSecret('ACCESS_TOKEN_SECRET', 'local-access-secret-change-me');
    }

    private getRefreshSecret(): string {
        return this.getSecret('REFRESH_TOKEN_SECRET', 'local-refresh-secret-change-me');
    }

    private getSecret(name: string, developmentFallback: string): string {
        const secret = process.env[name];
        if (secret) {
            return secret;
        }
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`${name} must be configured in production`);
        }
        return developmentFallback;
    }
}
