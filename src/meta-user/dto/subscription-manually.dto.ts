import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class subscriptionManuallyDto {

    @IsNotEmpty()
    @IsNumber()
    subscriptionId!: number;

    @IsNotEmpty()
    @IsNumber()
    days!: number;
    debtAmount!: number;

    @IsOptional()
    note!: string;
}