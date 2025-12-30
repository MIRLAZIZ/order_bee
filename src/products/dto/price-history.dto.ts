import { IsNotEmpty, IsNumber, IsOptional, IsEnum } from "class-validator";

export class PriceHistoryDto {

    @IsNumber()
    @IsNotEmpty()
    purchase_price: number;

    @IsNumber()
    @IsNotEmpty()
    selling_price: number;

    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @IsNumber()
    @IsNotEmpty()
    product_id: number;

    

}