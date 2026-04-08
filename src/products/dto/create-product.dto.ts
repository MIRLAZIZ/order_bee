
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateProductDto {

  
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()


  @IsNumber()
  @IsNotEmpty()
  quantity: number;



  @IsOptional()
  barcode: string;

  @IsOptional()
  @IsNumber()

  max_quantity_notification: number;

  @IsOptional()
  quick_code: string

  @IsNotEmpty()
  @IsNumber()
  unit_id: number



  // @IsBoolean()
  //  is_active?: boolean;


  @IsNotEmpty()
  @IsNumber()
  category_id: number;

  @IsNumber()
  purchase_price: number;

  @IsNumber()
  selling_price: number;

  @IsOptional()
  @IsNumber()
  deliveryCost: number;


  @IsOptional()
  @IsNumber()
  vatRate: number


  @IsOptional()
  costPrice: number





}

