import { IsEmpty } from "class-validator";

// src/products/dto/variant.dto.ts
export class VariantDto {
  @IsEmpty()
  title: string;
  @IsEmpty()
  price: number;
  @IsEmpty()
  quantity: number;
  @IsEmpty()
  image: string;
}