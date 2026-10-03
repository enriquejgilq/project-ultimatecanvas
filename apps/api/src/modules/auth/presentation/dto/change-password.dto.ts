import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { ChangePasswordDto as ChangePasswordContract } from '@ucanvas/shared';

export class ChangePasswordDto implements ChangePasswordContract {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  currentPassword!: string;

  @ApiProperty({ example: 'nueva-clave-2026', minLength: 10, maxLength: 128 })
  @IsString()
  @MaxLength(1024)
  newPassword!: string;
}
