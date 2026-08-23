import { ApiProperty } from '@nestjs/swagger';
import type { User } from '@ucanvas/shared';

export class UserEntity implements User {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
