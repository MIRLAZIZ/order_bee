import { IsNotEmpty, IsNumber, IsString, IsArray, ValidateNested, IsOptional, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { PaymentType } from "common/enums/paymentType.enum";

export class CreateSaleDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)   // 🔥 MUHIM
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)   // 🔥 MUHIM
  product_id: number;



  @IsOptional()
  @IsNumber()
  @Type(() => Number)   // 🔥 MUHIM
  discount: number;

  @IsNotEmpty()
  // @IsEnum(PaymentType, { message: "PaymentType noto'g'ri kiritilgan" })
  @Type(() => String)
  paymentType: string;

  // @IsNotEmpty()
  // @IsNumber()
  // @Type(() => Number)   // 🔥 MUHIM
  // total: number;
}


// create-sale-bulk.dto.ts
export class CreateSaleBulkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleDto)
  sales: CreateSaleDto[];
}




