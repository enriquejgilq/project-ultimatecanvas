import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import type { TokenDto as TokenContract } from '@ucanvas/shared';

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export class TokenDto implements TokenContract {
  @ApiProperty({ description: 'Token from the email link (43 chars, base64url)' })
  @Matches(TOKEN_PATTERN)
  token!: string;
}
