import { IsString, IsNumber, IsUrl, IsInt, Min, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Headphones' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Premium noise-cancelling wireless headphones' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ example: 99.99 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsUrl()
  imageUrl: string;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  inventory: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopifyProductId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopifyVariantId?: string;
}
