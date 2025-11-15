import { IsNotEmpty } from "class-validator"

export class CreateSaleDto {

    @IsNotEmpty()
    quantity: number

    @IsNotEmpty()
    product_id: number

    @IsNotEmpty()
    price: number

    @IsNotEmpty()
    discount: number

    @IsNotEmpty()
    paymentType: string


    @IsNotEmpty()
    total: number

}









