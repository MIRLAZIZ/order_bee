import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { Sale } from './entities/sale.entity';
import { Product } from 'src/products/entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SalesService {
  constructor( @InjectRepository(Sale) private readonly saleRepository:Repository<Sale>, @InjectRepository(Product) private readonly productRepository: Repository<Product>) {}
// service
async create(createSaleDtos: CreateSaleDto[], userId: number): Promise<Sale[]> {
  const sales: Sale[] = [];

  for (const dto of createSaleDtos) {
    // 1️⃣ Productni tekshirish: userIdga tegishli va bazada mavjudmi
    const product = await this.productRepository.findOne({ 
      where: { id: dto.product_id,  user:{id: userId} } 
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${dto.product_id} not found for this user`);
    }

    if (product.quantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock for product ${product.name}. Available: ${product.quantity}, Required: ${dto.quantity}`,
      );
    }

    // 2️⃣ Narxni hisoblash
    const unitPrice = product.price;
    const discount = dto.discount || 0;
    const total = unitPrice * dto.quantity - discount;

    // 3️⃣ Sale yozuvini yaratish
    const sale = this.saleRepository.create({
      product,
      user: { id: userId },
      quantity: dto.quantity,
      price: unitPrice,
      discount,
      total,
      paymentType: dto.paymentType,
    });

    const savedSale = await this.saleRepository.save(sale);
    sales.push(savedSale);

    // 4️⃣ Product stokini yangilash
    product.quantity -= dto.quantity;
    await this.productRepository.save(product);
  }



  return sales; // 🔹 Frontendga hamma saved salelarni yuboradi
}



  findAll(user_id: number) {
    return this.saleRepository.find({where:{user:{id:user_id}}, relations:['product'], order:{id:'DESC'}});
  }

  findOne(id: number) {
    return `This action returns a #${id} sale`;
  }

  update(id: number, updateSaleDto: UpdateSaleDto) {
    return `This action updates a #${id} sale`;
  }

  remove(id: number) {
    return `This action removes a #${id} sale`;
  }
}
