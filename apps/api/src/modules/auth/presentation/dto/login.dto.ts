import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { LoginDto as LoginContract } from '@ucanvas/shared';
import { NormalizeEmail } from './email.transform';

export class LoginDto implements LoginContract {
  @ApiProperty({ example: 'ana@example.com' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'lienzo-azul-2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  password!: string;

  @ApiProperty({ description: '"Mantener sesión iniciada": 30 days instead of a browser session' })
  @IsBoolean()
  rememberMe!: boolean;
}
