import { Allow, IsEnum, IsNotEmpty, IsNumber, IsString, Max, MaxLength, MinLength, ValidateIf } from "class-validator";
import { Role } from "common/enums/role.enum";

export default class UserDto {
 
  @IsString()
  @IsNotEmpty({ message: "Ism bo'sh bo'lishi mumkin emas" })
  fullName: string;




  @IsNotEmpty({ message: "Parol bo'sh bo'lishi mumkin emas" }) // 1) Avval har doim tekshirilsin
  password: string;

  @ValidateIf(o => o.password !== undefined && o.password !== '') // 2) Agar bor bo‘lsa, quyidagilar ishlasin
  @IsString({ message: "Parol faqat matn bo'lishi kerak" })
  @MinLength(6, { message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" })
  @MaxLength(20, { message: "Parol maksimal 20 ta belgidan oshmasligi kerak" })
  get passwordValidationTrigger() {
    return this.password;
  }

  @IsString()
  @IsNotEmpty()
  username: string

  @ValidateIf(o => o.role == 'admin' || o.role == 'client')
 @IsEnum(Role)
  role: string

  @ValidateIf(o => o._role !== 'admin' || o._role !== 'agent')
  @IsString()
  @IsNotEmpty()
  brandName: string


  @IsNotEmpty()
  @MinLength(12)
  @MaxLength(12)
  phone: string
  
  @Allow()
  _role: string




}

