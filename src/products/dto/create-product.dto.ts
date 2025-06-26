// import { Transform } from "class-transformer"
// import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator"

// export class CreateProductDto {
//         @IsNotEmpty()
//         @IsString()
//         name: string

//         @Transform(({ value }) => Number(value))
//          @IsNotEmpty()
//          @IsNumber()
//         price: number
         

//         @Transform(({ value }) => Number(value))
//         @IsNotEmpty()
//         @IsNumber()
//         quantity: string
    
//         @IsNotEmpty()
//         unit: string
//         @Transform(({ value }) => value === 'true')
//         @IsNotEmpty()
//         isAvailable: boolean
        
//         @IsOptional()
//         image: string

//          @Transform(({ value }) => Number(value))
//         @IsOptional()
//         @IsNumber()
//         count: number
// }


// src/products/dto/create-product.dto.ts
import { Type } from 'class-transformer';
import { ValidateNested, IsArray, IsString } from 'class-validator';
import { VariantDto } from './variant.dto';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  category_id: string;



  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];
}

