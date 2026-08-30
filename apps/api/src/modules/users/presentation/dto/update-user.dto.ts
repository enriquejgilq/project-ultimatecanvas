import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import type { UpdateUserDto as UpdateUserContract } from '@ucanvas/shared';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) implements UpdateUserContract {
  @ApiPropertyOptional({ example: 'ada@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'Ada Lovelace' })
  name?: string;
}
