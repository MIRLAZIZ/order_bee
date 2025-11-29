import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSaleDto, SaleResponseDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { Sale } from './entities/sale.entity';
import { Product } from 'src/products/entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

@Injectable()
export class SalesService {
  constructor(@InjectRepository(Sale) private readonly saleRepository: Repository<Sale>, @InjectRepository(Product) private readonly productRepository: Repository<Product>) { }


  private calculateTotal(price: number, quantity: number, discount: number = 0): number {
    const subtotal = price * quantity;
    return subtotal - discount;
  }

  // private async validateProductOwnerShip(userId: number): Promise<Product> {
  //   const product = await this.productRepository.findOne({

  //   })
  // }
  // service
//  async create(createSaleDtos: CreateSaleDto[], userId: number): Promise<SaleResponseDto[]> {
//   // 1️⃣ Transaction ichida ishlash
//   return await this.saleRepository.manager.transaction(async (manager) => {
//     const sales: Sale[] = [];

//     // 2️⃣ Barcha product ID larni olish
//     const productIds = createSaleDtos.map(dto => dto.product_id);
    
//     // 3️⃣ Barcha productlarni bir query'da olish (N+1 muammosini hal qilish)
//     const products = await manager.find(Product, {
//       where: { 
//         id: In(productIds), 
//         user: { id: userId } 
//       }
//     });

//     // 4️⃣ Productlarni Map'ga o'tkazish (tezroq qidirish uchun)
//     const productMap = new Map(products.map(p => [p.id, p]));

//     // 5️⃣ Har bir sale'ni tekshirish va yaratish
//     for (const dto of createSaleDtos) {
//       const product = productMap.get(dto.product_id);

//       // Validation
//       if (!product) {
//         throw new NotFoundException(
//           `ID ${dto.product_id} li mahsulot topilmadi yoki sizga tegishli emas`
//         );
//       }

//       if (product.quantity < dto.quantity) {
//         throw new BadRequestException(
//           `"${product.name}" mahsuloti yetarli emas. Mavjud: ${product.quantity}, Kerak: ${dto.quantity}`
//         );
//       }

//       // Total hisoblash
//       const total = this.calculateTotal(product.price, dto.quantity, dto.discount);

//       // Sale yaratish
//       const sale = manager.create(Sale, {
//         product,
//         user: { id: userId },
//         quantity: dto.quantity,
//         price: product.price,
//         discount: dto.discount,
//         total,
//         paymentType: dto.paymentType,
//       });

//       // Product quantity'ni kamaytirish
//       product.quantity -= dto.quantity;

//       sales.push(sale);
//     }

//     // 6️⃣ Barcha o'zgarishlarni bir vaqtning o'zida saqlash
//     await manager.save(Sale, sales);
//     await manager.save(Product, Array.from(productMap.values()));

//     // 7️⃣ Frontend uchun minimal ma'lumot qaytarish
//     return sales.map(sale => ({
//       ...sale,
//       product: {
//         id: sale.product.id,
//         name: sale.product.name,
//         // Faqat kerakli fieldlar
//       }
//     }));
//   });
// }


async create(createSaleDtos: CreateSaleDto[], userId: number): Promise<SaleResponseDto[]> {
  return await this.saleRepository.manager.transaction(async (manager) => {
    
    // 🔥 1. DUBLIKAT TEKSHIRISH (Eng birinchi!)
    const productIds = createSaleDtos.map(dto => dto.product_id);
    const uniqueIds = new Set(productIds);
    
    if (productIds.length !== uniqueIds.size) {
      throw new BadRequestException(
        'Bir xil mahsulotni bir vaqtning o\'zida 2 marta sotib bo\'lmaydi!'
      );
    }

    const sales: Sale[] = [];
    
    // 2. Barcha productlarni olish
    const products = await manager.find(Product, {
      where: { 
        id: In(Array.from(uniqueIds)),  // Set'dan Array'ga o'tkazish
        user: { id: userId } 
      }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // 3. Har bir sale'ni qayta ishlash
    for (const dto of createSaleDtos) {
      const product = productMap.get(dto.product_id);

      if (!product) {
        throw new NotFoundException(
          `ID ${dto.product_id} li mahsulot topilmadi`
        );
      }

      if (product.quantity < dto.quantity) {
        throw new BadRequestException(
          `"${product.name}" mahsuloti yetarli emas. Mavjud: ${product.quantity}, Kerak: ${dto.quantity}`
        );
      }

      const total = this.calculateTotal(product.price, dto.quantity, dto.discount);

      const sale = manager.create(Sale, {
        product,
        user: { id: userId },
        quantity: dto.quantity,
        price: product.price,
        discount: dto.discount,
        total,
        paymentType: dto.paymentType,
      });

      // 4. Quantity'ni kamaytirish
      product.quantity -= dto.quantity;
      sales.push(sale);
    }

    // 5. Saqlash
    await manager.save(Sale, sales);
    await manager.save(Product, Array.from(productMap.values()));

    // 7️⃣ Frontend uchun minimal ma'lumot qaytarish
    return sales.map(sale => ({
      ...sale,
      product: {
        id: sale.product.id,
        name: sale.product.name,
        // Faqat kerakli fieldlar
      }
    }));

    // return sales;
  });
}



  findAll(user_id: number) {
    return this.saleRepository.find({ where: { user: { id: user_id } }, relations: ['product'], order: { id: 'DESC' } });
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
