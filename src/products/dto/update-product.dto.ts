import { IsEnum, IsOptional, IsNumber, IsString, IsNotEmpty, IsBoolean } from 'class-validator';
import { PriceMode } from 'common/enums/priceMode.enum';

export class UpdateProductDto {
    @IsString()
    @IsNotEmpty()
    name: string;

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
    // is_active?: boolean;

    @IsEnum(PriceMode)
    @IsOptional()
    price_mode?: PriceMode
}
