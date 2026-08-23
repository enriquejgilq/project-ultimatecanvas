import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: 'ada@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'Ada Lovelace' })
  name?: string;
}
