import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import type { RegisterDto as RegisterContract } from '@ucanvas/shared';
import { NormalizeEmail } from './email.transform';

export class RegisterDto implements RegisterContract {
  @ApiProperty({ example: 'ana@example.com' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /** Length/complexity are checked by the password policy (422 with every broken rule). */
  @ApiProperty({ example: 'lienzo-azul-2026', minLength: 10, maxLength: 128 })
  @IsString()
  @MaxLength(1024)
  password!: string;
}
