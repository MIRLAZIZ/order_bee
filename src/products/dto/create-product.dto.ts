
import { Type } from 'class-transformer';
import { ValidateNested, IsArray, IsString, IsNotEmpty } from 'class-validator';
import { VariantDto } from './variant.dto';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category_id: number;


 
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];
}

