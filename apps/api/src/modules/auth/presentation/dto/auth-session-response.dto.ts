import { ApiProperty } from '@nestjs/swagger';
import type { AuthSession } from '@ucanvas/shared';
import { AuthUserResponseDto } from './auth-user-response.dto';

export class AuthSessionResponseDto implements AuthSession {
  @ApiProperty({ description: 'Short-lived JWT. Keep it in memory only; send as Bearer.' })
  accessToken!: string;

  @ApiProperty({
    description: 'Seconds until the access token expires (900 with the default config)',
  })
  expiresIn!: number;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  static fromDomain(session: AuthSession): AuthSessionResponseDto {
    return Object.assign(new AuthSessionResponseDto(), {
      ...session,
      user: AuthUserResponseDto.fromDomain(session.user),
    });
  }
}
