import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { PriceMode } from 'common/enums/priceMode.enum';

export class UpdateProductDto extends PartialType(CreateProductDto) {
   
}
