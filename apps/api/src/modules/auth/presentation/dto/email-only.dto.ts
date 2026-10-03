import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';
import type { EmailOnlyDto as EmailOnlyContract } from '@ucanvas/shared';
import { NormalizeEmail } from './email.transform';

export class EmailOnlyDto implements EmailOnlyContract {
  @ApiProperty({ example: 'ana@example.com' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
