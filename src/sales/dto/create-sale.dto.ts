import { IsNotEmpty, IsNumber, IsString, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class CreateSaleDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)   // 🔥 MUHIM
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)   // 🔥 MUHIM
  product_id: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)   // 🔥 MUHIM
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)   // 🔥 MUHIM
  discount: number;

  @IsNotEmpty()
  @IsString()
  paymentType: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)   // 🔥 MUHIM
  total: number;
}


// create-sale-bulk.dto.ts
export class CreateSaleBulkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleDto)
  sales: CreateSaleDto[];
}



// DTO yarating response uchun
export class SaleResponseDto {
  id: number;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  paymentType: string;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: number;
    name: string;
  };
}
