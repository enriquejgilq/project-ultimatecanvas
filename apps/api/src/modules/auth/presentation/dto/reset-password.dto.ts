import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';
import type { ResetPasswordDto as ResetPasswordContract } from '@ucanvas/shared';
import { TOKEN_PATTERN } from './token.dto';

export class ResetPasswordDto implements ResetPasswordContract {
  @ApiProperty({ description: 'Token from the reset link (43 chars, base64url)' })
  @Matches(TOKEN_PATTERN)
  token!: string;

  @ApiProperty({ example: 'nueva-clave-2026', minLength: 10, maxLength: 128 })
  @IsString()
  @MaxLength(1024)
  newPassword!: string;
}
