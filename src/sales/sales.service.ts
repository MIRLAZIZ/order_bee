import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleResponseDto, SaleResponseGetDto } from './dto/sale-response.dto';
import { Sale } from './entities/sale.entity';
import { Product } from 'src/products/entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProductsService } from 'src/products/products.service';
import { PriceMode } from 'common/enums/priceMode.enum';
import { ProductPriceHistory } from 'src/products/entities/product-price-history.entity';
import { log } from 'winston';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale) private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    private readonly productService: ProductsService

  ) { }


  private calculateTotal(price: number, quantity: number, discount: number = 0): number {
    const subtotal = price * quantity;
    return subtotal - discount;
  }




  async create(
    createSaleDtos: CreateSaleDto[],
    userId: number,
  ): Promise<{ sales: SaleResponseDto[]; warnings: any[] }> {


    return await this.saleRepository.manager.transaction(async (manager) => {

      // 🔥 1. DUBLIKAT TEKSHIRISH
      const productIds = createSaleDtos.map(dto => dto.product_id);
      const uniqueIds = new Set(productIds);

      if (productIds.length !== uniqueIds.size) {
        throw new BadRequestException(
          'Bir xil mahsulotni bir vaqtning o‘zida 2 marta sotib bo‘lmaydi!',
        );
      }

      const sales: Sale[] = [];
      const warnings: any[] = [];
      const updatedPriceHistories: ProductPriceHistory[] = [];

      // 2. PRODUCTLARNI OLISH
      const products = await manager.find(Product, {
        where: {
          id: In([...uniqueIds]),
          user: { id: userId },
        },
      });

      const productMap = new Map(products.map(p => [p.id, p]));

      // 3. HAR BIR SALE
      for (const dto of createSaleDtos) {
        const product = productMap.get(dto.product_id);

        if (!product) {
          throw new NotFoundException(
            `ID ${dto.product_id} li mahsulot topilmadi`,
          );
        }

        if (product.quantity < dto.quantity) {
          throw new BadRequestException(
            `"${product.name}" mahsuloti yetarli emas. Mavjud: ${product.quantity}, so‘ralgan: ${dto.quantity}`,
          );
        }

        // 📉 product umumiy quantity
        product.quantity -= dto.quantity;

        // 🔍 oxirgi 2 ta price history
        const priceHistories =
          await this.productService.getLastTwoPriceHistories(
            dto.product_id,
            userId,
          );

        const currentPrice = priceHistories[0] ?? null;
        const oldPrice = priceHistories[1] ?? null;

        if (!currentPrice) {
          throw new BadRequestException('Amaldagi narx topilmadi');
        }

        // =========================
        // 💰 CURRENT MODE
        // =========================
        if (product.price_mode === PriceMode.Current) {
          const sale = manager.create(Sale, {
            product,
            user: { id: userId },
            quantity: dto.quantity,
            discount: dto.discount,
            paymentType: dto.paymentType,
            productPrice: { id: currentPrice.id },
            purchase_price: currentPrice.purchase_price,
            selling_price: currentPrice.selling_price,
            total: this.calculateTotal(currentPrice.selling_price, dto.quantity, dto.discount),
          });

          currentPrice.quantity -= dto.quantity;
          updatedPriceHistories.push(currentPrice);

          sales.push(sale);
        }

        // =========================
        // 💰 OLD MODE
        // =========================
        if (product.price_mode === PriceMode.Old) {
          if (!oldPrice) {
            throw new BadRequestException(
              `"${product.name}" uchun eski narx topilmadi`,
            );
          }

          const oldAvailableQty = oldPrice.quantity ?? 0;

          // 🟢 Hammasi eski narxda
          if (oldAvailableQty >= dto.quantity) {
            const sale = manager.create(Sale, {
              product,
              user: { id: userId },
              quantity: dto.quantity,
              discount: dto.discount,
              paymentType: dto.paymentType,
              productPrice: { id: oldPrice.id },
              purchase_price: oldPrice.purchase_price,
              selling_price: oldPrice.selling_price,
              total: this.calculateTotal(oldPrice.selling_price, dto.quantity, dto.discount),
            });

            oldPrice.quantity -= dto.quantity;
            updatedPriceHistories.push(oldPrice);
            sales.push(sale);
          }

          // 🔴 Bo‘linadi (eski + yangi)
          else {
            // eski narx
            if (oldAvailableQty > 0) {
              const oldSale = manager.create(Sale, {
                product,
                user: { id: userId },
                quantity: oldAvailableQty,
                discount: dto.discount,
                paymentType: dto.paymentType,
                productPrice: { id: oldPrice.id },
                purchase_price: oldPrice.purchase_price,
                selling_price: oldPrice.selling_price,
                total: this.calculateTotal(oldPrice.selling_price, oldAvailableQty, dto.discount),
              });

              sales.push(oldSale);
              oldPrice.quantity = 0;
              updatedPriceHistories.push(oldPrice);
              product.price_mode = PriceMode.Current;
            }

            // yangi narx
            const remainingQty = dto.quantity - oldAvailableQty;

            const newSale = manager.create(Sale, {
              product,
              user: { id: userId },
              quantity: remainingQty,
              discount: dto.discount,
              paymentType: dto.paymentType,
              productPrice: { id: currentPrice.id },
              purchase_price: currentPrice.purchase_price,
              selling_price: currentPrice.selling_price,
              total: this.calculateTotal(currentPrice.selling_price, remainingQty, dto.discount),
            });

            sales.push(newSale);

            warnings.push({
              productId: product.id,
              productName: product.name,
              message: `${oldAvailableQty} ta eski narxda, ${remainingQty} ta yangi narxda sotildi`,
            });
          }
        }
      }

      // 💾 SAQLASH
      await manager.save(Sale, sales);
      await manager.save(Product, [...productMap.values()]);
      await manager.save(ProductPriceHistory, updatedPriceHistories);


      let totalSum = 0

      // 📦 RESPONSE
      const responseData: SaleResponseDto[] = sales.map(sale => {
        const selling_price = sale.selling_price
        const quantity = sale.quantity;
        const discount = sale.discount ?? 0;
        const purchase_price = sale.purchase_price
        const total: number = this.calculateTotal(selling_price, quantity, discount);
        totalSum += total


        return {
          id: sale.id,
          quantity,
          selling_price,
          purchase_price,
          discount,
          total,
          paymentType: sale.paymentType,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
          product: {
            id: sale.product.id,
            name: sale.product.name,
          },
        };
      });

      return {
        sales: responseData,
        totalSum,
        warnings,
      };


    });
  }





  async findAll(user_id: number): Promise<SaleResponseGetDto[]> {
    const sales = await this.saleRepository.find({ where: { user: { id: user_id } }, relations: ['product'], order: { id: 'DESC' } });
    const data = sales.map(sale => ({
      id: sale.id,
      quantity: sale.quantity,
      selling_price: sale.selling_price,
      purchase_price: sale.purchase_price,
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
      selling_price: sale.selling_price,
      purchase_price: sale.purchase_price,
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
        // sale.price = newProduct.selling_price;
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
      sale.total = this.calculateTotal(sale.selling_price, sale.quantity, sale.discount);

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

  // // STATISTICS metodi
  // async getStatistics(userId: number, startDate?: Date, endDate?: Date) {
  //   const queryBuilder = this.saleRepository
  //     .createQueryBuilder('sale')
  //     .leftJoinAndSelect('sale.product', 'product')
  //     .where('sale.user_id = :userId', { userId });

  //   // Sana filtri
  //   if (startDate && endDate) {
  //     queryBuilder.andWhere('sale.createdAt BETWEEN :startDate AND :endDate', {
  //       startDate,
  //       endDate
  //     });
  //   }

  //   const sales = await queryBuilder.getMany();

  //   // Umumiy statistika
  //   const totalSales = sales.length;
  //   const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  //   const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount, 0);
  //   const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);

  //   // To'lov turlari bo'yicha
  //   const paymentTypeStats = sales.reduce((acc, sale) => {
  //     acc[sale.paymentType] = (acc[sale.paymentType] || 0) + sale.total;
  //     return acc;
  //   }, {} as Record<string, number>);

  //   // Eng ko'p sotilgan mahsulotlar
  //   const productStats = sales.reduce((acc, sale) => {
  //     const productId = sale.product.id;
  //     if (!acc[productId]) {
  //       acc[productId] = {
  //         product_id: productId,
  //         product_name: sale.product.name,
  //         total_quantity: 0,
  //         total_revenue: 0,
  //         sales_count: 0
  //       };
  //     }
  //     acc[productId].total_quantity += sale.quantity;
  //     acc[productId].total_revenue += sale.total;
  //     acc[productId].sales_count += 1;
  //     return acc;
  //   }, {} as Record<number, any>);

  //   const topProducts = Object.values(productStats)
  //     .sort((a: any, b: any) => b.total_revenue - a.total_revenue)
  //     .slice(0, 10);

  //   // Kunlik statistika
  //   const dailyStats = sales.reduce((acc, sale) => {
  //     const date = new Date(sale.createdAt).toISOString().split('T')[0];
  //     if (!acc[date]) {
  //       acc[date] = { date, total_sales: 0, total_revenue: 0, sales_count: 0 };
  //     }
  //     acc[date].total_revenue += sale.total;
  //     acc[date].sales_count += 1;
  //     acc[date].total_sales += sale.quantity;
  //     return acc;
  //   }, {} as Record<string, any>);

  //   return {
  //     period: {
  //       start: startDate || 'Hammasi',
  //       end: endDate || 'Hozirgi vaqt'
  //     },
  //     summary: {
  //       total_sales: totalSales,
  //       total_revenue: totalRevenue,
  //       total_discount: totalDiscount,
  //       total_quantity: totalQuantity,
  //       average_sale: totalSales > 0 ? totalRevenue / totalSales : 0
  //     },
  //     payment_types: paymentTypeStats,
  //     top_products: topProducts,
  //     daily_statistics: Object.values(dailyStats).sort((a: any, b: any) =>
  //       new Date(b.date).getTime() - new Date(a.date).getTime()
  //     )
  //   };
  // }





  //   // 📌 STATISTIKA SERVISI
  // async getStatistics(userId: number, startDate?: Date, endDate?: Date) {

  //   // 1️⃣ So'rovni qurish (faqat foydalanuvchiga tegishli sotuvlar olinadi)
  //   const queryBuilder = this.saleRepository
  //     .createQueryBuilder('sale')
  //     .leftJoinAndSelect('sale.product', 'product')
  //     .where('sale.user_id = :userId', { userId });

  //   // 2️⃣ Agar foydalanuvchi sana bo‘yicha filter qo‘llagan bo‘lsa
  //   if (startDate && endDate) {
  //     queryBuilder.andWhere('sale.createdAt BETWEEN :startDate AND :endDate', {
  //       startDate,
  //       endDate
  //     });
  //   }

  //   // 3️⃣ Barcha sotuvlarni olish
  //   const sales = await queryBuilder.getMany();

  //   // -------------------- UMUMIY STATISTIKA --------------------

  //   // 🔢 Jami sotuvlar soni
  //   const totalSales = sales.length;

  //   // 💰 Umumiy tushum
  //   const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

  //   // 🎟️ Jami chegirmalar
  //   const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount, 0);

  //   // 📦 Sotilgan mahsulotlar umumiy soni
  //   const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);

  //   // -------------------- TO'LOV TURLARI BO'YICHA --------------------

  //   // 💳 To'lov turlarini guruhlash (Naqd, Payme, Click va boshqalar)
  //   const paymentTypeStats = sales.reduce((acc, sale) => {
  //     acc[sale.paymentType] = (acc[sale.paymentType] || 0) + sale.total;
  //     return acc;
  //   }, {} as Record<string, number>);

  //   // -------------------- MAHSULOTLAR BO'YICHA --------------------

  //   // 📌 Har bir mahsulot bo‘yicha sotuv statistikasi
  //   const productStats = sales.reduce((acc, sale) => {
  //     const productId = sale.product.id;

  //     if (!acc[productId]) {
  //       acc[productId] = {
  //         product_id: productId,
  //         product_name: sale.product.name,
  //         total_quantity: 0,
  //         total_revenue: 0,
  //         sales_count: 0
  //       };
  //     }

  //     acc[productId].total_quantity += sale.quantity;
  //     acc[productId].total_revenue += sale.total;
  //     acc[productId].sales_count += 1;

  //     return acc;
  //   }, {} as Record<number, any>);

  //   // 🔝 Eng ko‘p foyda bergan 10 ta mahsulot
  //   const topProducts = Object.values(productStats)
  //     .sort((a: any, b: any) => b.total_revenue - a.total_revenue)
  //     .slice(0, 10);

  //   // -------------------- KUNLIK STATISTIKA --------------------

  //   // 📆 Har kun uchun sotuvlar statistikasi
  //   const dailyStats = sales.reduce((acc, sale) => {
  //     const date = new Date(sale.createdAt).toISOString().split('T')[0];

  //     if (!acc[date]) {
  //       acc[date] = { 
  //         date, 
  //         total_sales: 0, 
  //         total_revenue: 0, 
  //         sales_count: 0 
  //       };
  //     }

  //     acc[date].total_revenue += sale.total;
  //     acc[date].sales_count += 1;
  //     acc[date].total_sales += sale.quantity;

  //     return acc;
  //   }, {} as Record<string, any>);

  //   // -------------------- NATIJA QAYTARISH --------------------

  //   return {
  //     period: {
  //       start: startDate || 'Barchasi',
  //       end: endDate || 'Hozirgi vaqt'
  //     },
  //     summary: {
  //       total_sales: totalSales,               // Jami sotuvlar
  //       total_revenue: totalRevenue,           // Umumiy tushum
  //       total_discount: totalDiscount,         // Umumiy chegirma
  //       total_quantity: totalQuantity,         // Jami sotilgan mahsulotlar
  //       average_sale: totalSales > 0 ? totalRevenue / totalSales : 0 // O‘rtacha bir sotuvdan tushgan daromad
  //     },
  //     payment_types: paymentTypeStats,         // To‘lov turlari bo‘yicha natija
  //     top_products: topProducts,               // Eng ko‘p sotilgan mahsulotlar
  //     daily_statistics: Object.values(dailyStats)
  //       .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  //   };
  // }











}
