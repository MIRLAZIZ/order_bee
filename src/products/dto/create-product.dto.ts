import { IsNotEmpty, IsNumber, IsString } from "class-validator"

export class CreateProductDto {
        @IsNotEmpty()
        @IsString()
        name: string
         @IsNotEmpty()
         @IsNumber()
        price: number
        
        @IsNotEmpty()
        @IsNumber()
        quantity: number
    
        @IsNotEmpty()
        unit: number
    
        @IsNotEmpty()
        isAvailable: true
        
        image: string
    
        count: number
}
