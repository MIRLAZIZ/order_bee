import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleResponseDto, SaleResponseGetDto } from './dto/sale-response.dto';
import { Sale } from './entities/sale.entity';
import { Product } from 'src/products/entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { ProductsService } from 'src/products/products.service';
import { PriceMode } from 'common/enums/priceMode.enum';
import { ProductPriceHistory } from 'src/products/entities/product-price-history.entity';
import { PaginationResponse } from 'common/interface/pagination.interface';
import { SaleStatus } from 'common/enums/sale-status.enum';
import { SaleSearchParams } from 'common/interface/sale-search';
import { StatisticsService } from 'src/statistics/statistics.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale) private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    private readonly productService: ProductsService,
    private readonly statisticsService: StatisticsService,
    @InjectQueue('sales-queue') private salelQueue: Queue
  ) { }


  private calculateTotal(price: number, quantity: number, discount: number = 0): number {
    const subtotal = price * quantity;
    return subtotal - discount;
  }




  async create(
    createSaleDtos: CreateSaleDto[],
    userId: number,
  ): Promise<{ sales: SaleResponseDto[]; warnings: any[] }> {


    const reducedProduct: { id: number, name: string, quantity: number }[] = []


    const results = await this.saleRepository.manager.transaction(async (manager) => {

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
            `${product.name} mahsuloti yetarli emas. Mavjud: ${product.quantity}, so‘ralgan: ${dto.quantity}`,
          );
        }

        // 📉 product umumiy quantity 
        product.quantity -= dto.quantity;
        if (product.quantity <= product.max_quantity_notification) {
          reducedProduct.push({
            id: product.id,
            name: product.name,
            quantity: product.quantity
          })
        }

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

            currentPrice.quantity -= remainingQty;
            updatedPriceHistories.push(currentPrice);

            warnings.push({
              productId: product.id,
              productName: product.name,
              message: `${oldAvailableQty} ta ${oldPrice.selling_price} so‘m dan , ${remainingQty} ta yangi narx ${currentPrice.selling_price} so‘m sotildi`,
            });
          }
        }
      }

      // 💾 SAQLASH
      await manager.save(Sale, sales);
      await manager.save(Product, [...productMap.values()]);
      await manager.save(ProductPriceHistory, updatedPriceHistories);


      const responseData: SaleResponseDto[] = [];
      let totalSum = 0;

      for (const sale of sales) {
        // statistics update
        await this.statisticsService.createOrUpdate(manager, {
          userId,
          productId: sale.product.id,
          quantity: sale.quantity,
          totalSales: sale.selling_price,
          discount: sale.discount ?? 0,
          profit: (sale.selling_price - sale.purchase_price) * sale.quantity
        });

        // response tayyorlash
        const selling_price = sale.selling_price;
        const quantity = sale.quantity;
        const discount = sale.discount ?? 0;
        const total = this.calculateTotal(selling_price, quantity, discount);
        totalSum += total;


        responseData.push({
          id: sale.id,
          quantity,
          selling_price,
          discount,
          total,
          paymentType: sale.paymentType,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
          product: {
            id: sale.product.id,
            name: sale.product.name,
          },
        });
      }







      return {
        sales: responseData,
        totalSum,
        warnings,
      };


    });


    if (reducedProduct.length > 0) {
      await this.salelQueue.add('sale-created', reducedProduct);

    }






    return results
  }





  async findAll(user_id: number, page: number = 1, limit: number = 12): Promise<PaginationResponse<SaleResponseGetDto>> {
    const skip = (page - 1) * limit
    const [sales, total] = await this.saleRepository
      .findAndCount({
        where: { user: { id: user_id } },
        relations: ['product', 'user'],
        order: { id: 'DESC' },
        skip,
        take: limit
      });

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
    return {
      data: data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),

    };




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


  // ✅ 1. CANCEL (Bekor qilish)
  async cancelSale(
    id: number,
    userId: number,
    reason?: string
  ): Promise<{ message: string; refundedSale: SaleResponseDto }> {

    return await this.saleRepository.manager.transaction(async (manager) => {

      // Sale ni topish
      const sale = await manager.findOne(Sale, {
        where: { id, user: { id: userId } },
        relations: ['product']
      });
      console.log(typeof sale?.quantity);


      if (!sale) {
        throw new NotFoundException(`ID ${id} li sotuv topilmadi`);
      }

      // Allaqachon bekor qilinganmi?
      if (sale.status !== SaleStatus.COMPLETED) {
        throw new BadRequestException(
          `Bu sotuv allaqachon ${sale.status} holatida`
        );
      }

      // ==========================================
      // QUANTITY VA PRICE HISTORY NI QAYTARISH
      // ==========================================

      // 1. Product quantity qaytarish
      sale.product.quantity += sale.quantity;
      await manager.save(Product, sale.product);

      // 2. Price History quantity qaytarish
      // const priceHistory = await manager.findOne(ProductPriceHistory, {
      //   where: { id: sale.productPrice.id }

      // });
      const priceHistory = await manager.findOne(ProductPriceHistory, {
        where: {
          product: { id: sale.product.id }
        },
        order: { createdAt: 'DESC' }
      });

      if (priceHistory) {
        priceHistory.quantity += sale.quantity;
        await manager.save(ProductPriceHistory, priceHistory);
      }

      sale.status = SaleStatus.CANCELLED;
      sale.cancelled_reason = reason || null;
      sale.cancelled_at = new Date();
      sale.cancelled_by = userId;

      await manager.save(Sale, sale);

      return {
        message: 'Sotuv bekor qilindi va mahsulot qaytarildi',
        refundedSale: sale
      };
    });
  }

  async searchSales(
    userId: number,
    params: SaleSearchParams,
    page: number = 1,
    limit: number = 12
  ) {
    console.log(params.date);



    const skip = (page - 1) * limit;

    const qb = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.product', 'product')
      // .leftJoinAndSelect('sale.user', 'user')
      .where('sale.user_id = :userId', { userId });

    if (params.productName?.trim()) {


      qb.andWhere('LOWER(product.name) LIKE LOWER(:productName)', {
        productName: `%${params.productName.trim()}%`
      });
    }

    if (params.quantity != null) {
      qb.andWhere('sale.quantity = :quantity', { quantity: params.quantity });
    }

    if (params.date) {
      qb.andWhere('DATE(sale.createdAt) = DATE(:date)', { date: params.date });
    }

    qb.orderBy('sale.createdAt', 'DESC')
      .addOrderBy('sale.id', 'DESC')
      .skip(skip)
      .take(limit);

    const [sales, total] = await qb.getManyAndCount();

    const data = sales.map(sale => ({
      id: sale.id,
      userId,
      quantity: sale.quantity,
      selling_price: sale.selling_price,
      discount: sale.discount,
      total: sale.total,
      paymentType: sale.paymentType,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      product: {
        id: sale.product.id,
        name: sale.product.name,
      },

    }));

    return {
      data: data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

  }



}


