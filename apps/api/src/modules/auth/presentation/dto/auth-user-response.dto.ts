import { ApiProperty } from '@nestjs/swagger';
import type { AuthUser } from '@ucanvas/shared';

export class AuthUserResponseDto implements AuthUser {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ enum: [true] })
  emailVerified!: true;

  static fromDomain(user: AuthUser): AuthUserResponseDto {
    return Object.assign(new AuthUserResponseDto(), user);
  }
}
