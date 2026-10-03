import { ApiProperty } from '@nestjs/swagger';
import type { MessageResponse } from '@ucanvas/shared';

export class MessageResponseDto implements MessageResponse {
  @ApiProperty({ example: 'Si los datos son correctos, recibirás un correo en unos minutos.' })
  message!: string;

  static of(message: string): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.message = message;
    return dto;
  }
}
