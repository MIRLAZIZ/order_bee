
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;
  
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsOptional()
  image: string;


  @IsOptional()
  barcode: string;

  @IsNumber()
  max_quantity_notification: number;

  @IsOptional()
  uid: string

  @IsNotEmpty()
  @IsNumber()
  unit_id: number


  // @IsString()
  // @IsNotEmpty()
  // category_id: number;




}

