import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleResponseDto, SaleResponseGetDto } from './dto/sale-response.dto';
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



  async findAll(user_id: number): Promise<SaleResponseGetDto[]> {
    const sales = await this.saleRepository.find({ where: { user: { id: user_id } }, relations: ['product'], order: { id: 'DESC' } });
    const data = sales.map(sale => ({
      id: sale.id,
      quantity: sale.quantity,
      price: sale.price,
      discount: sale.discount,
      total: sale.total,
      paymentType: sale.paymentType,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      product: {
        id: sale.product.id,
        name: sale.product.name,
        // Faqat kerakli fieldlar
      },
      user: {
        id: sale.user.id,
        name: sale.user.fullName,
        // Faqat kerakli fieldlar
      }
    }))
    return data



  }

 
async findOne(id: number, userId: number): Promise<SaleResponseGetDto> {
  const sale = await this.saleRepository.findOne({
    where: { id, user: { id: userId } },
    relations: ['product', 'user']
  });
  
  // ✅ Null check
  if (!sale) {
    throw new NotFoundException(`ID ${id} li sotuv topilmadi`);
  }
  
  // ✅ Endi sale null emas, TypeScript buni biladi
  return {
    id: sale.id,
    quantity: sale.quantity,
    price: sale.price,
    discount: sale.discount,
    total: sale.total,
    paymentType: sale.paymentType,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
    product: {
      id: sale.product.id,
      name: sale.product.name,
    },
    user: {
      id: sale.user.id,
      name: sale.user.fullName,
    }
  };
}

  // UPDATE metodi
  async update(id: number, updateSaleDto: CreateSaleDto, userId: number): Promise<Sale> {
    return await this.saleRepository.manager.transaction(async (manager) => {
      // 1. Sale'ni topish
      const sale = await manager.findOne(Sale, {
        where: { id, user: { id: userId } },
        relations: ['product', 'user']
      });

      if (!sale) {
        throw new NotFoundException(`ID ${id} li sotuv topilmadi`);
      }

      // 2. Agar product o'zgartirilsa
      if (updateSaleDto.product_id && updateSaleDto.product_id !== sale.product.id) {
        const newProduct = await manager.findOne(Product, {
          where: { id: updateSaleDto.product_id, user: { id: userId } }
        });

        if (!newProduct) {
          throw new NotFoundException(`ID ${updateSaleDto.product_id} li mahsulot topilmadi`);
        }

        // Eski productga quantity qaytarish
        sale.product.quantity += sale.quantity;
        await manager.save(Product, sale.product);

        // Yangi productdan quantity ayirish
        const newQuantity = updateSaleDto.quantity || sale.quantity;
        if (newProduct.quantity < newQuantity) {
          throw new BadRequestException(
            `"${newProduct.name}" mahsuloti yetarli emas. Mavjud: ${newProduct.quantity}`
          );
        }

        newProduct.quantity -= newQuantity;
        await manager.save(Product, newProduct);

        sale.product = newProduct;
        sale.price = newProduct.price;
      }

      // 3. Agar faqat quantity o'zgartirilsa
      if (updateSaleDto.quantity && updateSaleDto.quantity !== sale.quantity) {
        const difference = updateSaleDto.quantity - sale.quantity;

        if (sale.product.quantity < difference) {
          throw new BadRequestException(
            `Mahsulot yetarli emas. Mavjud: ${sale.product.quantity}`
          );
        }

        sale.product.quantity -= difference;
        await manager.save(Product, sale.product);
        sale.quantity = updateSaleDto.quantity;
      }

      // 4. Boshqa fieldlarni yangilash
      if (updateSaleDto.discount !== undefined) {
        sale.discount = updateSaleDto.discount;
      }

      if (updateSaleDto.paymentType) {
        sale.paymentType = updateSaleDto.paymentType;
      }

      // 5. Total'ni qayta hisoblash
      sale.total = this.calculateTotal(sale.price, sale.quantity, sale.discount);

      // 6. Saqlash
      return await manager.save(Sale, sale);
    });
  }

  // DELETE metodi
  async remove(id: number, userId: number): Promise<{ message: string }> {
    return await this.saleRepository.manager.transaction(async (manager) => {
      // 1. Sale'ni topish
      const sale = await manager.findOne(Sale, {
        where: { id, user: { id: userId } },
        relations: ['product']
      });

      if (!sale) {
        throw new NotFoundException(`ID ${id} li sotuv topilmadi`);
      }

      // 2. Product quantity'ni qaytarish
      sale.product.quantity += sale.quantity;
      await manager.save(Product, sale.product);

      // 3. Sale'ni o'chirish
      await manager.remove(Sale, sale);

      return {
        message: `ID ${id} li sotuv muvaffaqiyatli o'chirildi va mahsulot miqdori qaytarildi`
      };
    });
  }

  // STATISTICS metodi
  async getStatistics(userId: number, startDate?: Date, endDate?: Date) {
    const queryBuilder = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.product', 'product')
      .where('sale.user_id = :userId', { userId });

    // Sana filtri
    if (startDate && endDate) {
      queryBuilder.andWhere('sale.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });
    }

    const sales = await queryBuilder.getMany();

    // Umumiy statistika
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount, 0);
    const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);

    // To'lov turlari bo'yicha
    const paymentTypeStats = sales.reduce((acc, sale) => {
      acc[sale.paymentType] = (acc[sale.paymentType] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    // Eng ko'p sotilgan mahsulotlar
    const productStats = sales.reduce((acc, sale) => {
      const productId = sale.product.id;
      if (!acc[productId]) {
        acc[productId] = {
          product_id: productId,
          product_name: sale.product.name,
          total_quantity: 0,
          total_revenue: 0,
          sales_count: 0
        };
      }
      acc[productId].total_quantity += sale.quantity;
      acc[productId].total_revenue += sale.total;
      acc[productId].sales_count += 1;
      return acc;
    }, {} as Record<number, any>);

    const topProducts = Object.values(productStats)
      .sort((a: any, b: any) => b.total_revenue - a.total_revenue)
      .slice(0, 10);

    // Kunlik statistika
    const dailyStats = sales.reduce((acc, sale) => {
      const date = new Date(sale.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, total_sales: 0, total_revenue: 0, sales_count: 0 };
      }
      acc[date].total_revenue += sale.total;
      acc[date].sales_count += 1;
      acc[date].total_sales += sale.quantity;
      return acc;
    }, {} as Record<string, any>);

    return {
      period: {
        start: startDate || 'Hammasi',
        end: endDate || 'Hozirgi vaqt'
      },
      summary: {
        total_sales: totalSales,
        total_revenue: totalRevenue,
        total_discount: totalDiscount,
        total_quantity: totalQuantity,
        average_sale: totalSales > 0 ? totalRevenue / totalSales : 0
      },
      payment_types: paymentTypeStats,
      top_products: topProducts,
      daily_statistics: Object.values(dailyStats).sort((a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    };
  }









}
