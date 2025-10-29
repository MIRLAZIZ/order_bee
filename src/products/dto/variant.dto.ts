import { IsNumber, IsOptional } from "class-validator";

// src/products/dto/variant.dto.ts
export class VariantDto {
  @IsOptional()
  name: string;

  @IsOptional()
  price: number;

  @IsOptional()
  quantity: number;

  @IsOptional()
  image: string;

  @IsOptional()
  description: string;

  @IsOptional()
  barcode: string;

  @IsNumber()
  max_quantity_notification: number;

  @IsOptional()
  uid: string
}