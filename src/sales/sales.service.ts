import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleResponseDto, SaleResponseGetDto } from './dto/sale-response.dto';
import { Sale } from './entities/sale.entity';
import { Product } from 'src/products/entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { ProductsService } from 'src/products/products.service';
import { PriceMode } from 'common/enums/priceMode.enum';
import { ProductBatch } from 'src/products/entities/product-batch.entity';
import { PaginationResponse } from 'common/interface/pagination.interface';
import { SaleStatus } from 'common/enums/sale-status.enum';
import { SaleSearchParams } from 'common/interface/sale-search';
import { StatisticsService } from 'src/statistics/statistics.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ReducedInterface } from 'common/interface/reduced.interface';

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
): Promise<{ sales: SaleResponseDto[]; totalSum: number; warnings: any[] }> {

  const reducedProduct: ReducedInterface[] = [];

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
    const updatedBatchesMap = new Map<number, ProductBatch>();

    // 🔍 2. PRODUCTLARNI OLISH
    const products = await manager.find(Product, {
      where: {
        id: In([...uniqueIds]),
        user: { id: userId },
      },
      relations: ['user'],
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // 🔁 3. HAR BIR SALE
    for (const dto of createSaleDtos) {

      const product = productMap.get(dto.product_id);

      if (!product) {
        throw new NotFoundException(
          `ID ${dto.product_id} li mahsulot topilmadi`,
        );
      }

      // 🔒 FIFO batchlarni olish (lock bilan)
      const batches = await manager.find(ProductBatch, {
        where: {
          product: { id: dto.product_id },
          remaining_quantity: Not(0),
        },
        order: { createdAt: 'ASC' }, // FIFO
        lock: { mode: 'pessimistic_write' },
      });

      if (!batches.length) {
        throw new BadRequestException(
          `${product.name} uchun mahsulot qolmagan`,
        );
      }

      let requiredQty = dto.quantity;

      for (const batch of batches) {
        if (requiredQty <= 0) break;

        const available = batch.remaining_quantity;
        const takeQty = Math.min(available, requiredQty);

        // 🧾 SALE yaratish
        const sale = manager.create(Sale, {
          product,
          user: { id: userId },
          quantity: takeQty,
          discount: dto.discount,
          paymentType: dto.paymentType,
          productBatch: { id: batch.id },
          purchase_price: batch.purchase_price,
          selling_price: batch.selling_price,
          total: this.calculateTotal(
            batch.selling_price,
            takeQty,
            dto.discount,
          ),
        });

        sales.push(sale);

        // 📉 batch kamaytirish
        batch.remaining_quantity -= takeQty;

        if (batch.remaining_quantity === 0) {
          batch.depleted_at = new Date();
        }

        updatedBatchesMap.set(batch.id, batch);

        requiredQty -= takeQty;
      }

      // ❗ yetarli bo‘lmasa
      if (requiredQty > 0) {
        throw new BadRequestException(
          `${product.name} mahsuloti yetarli emas`,
        );
      }

      // 📉 product umumiy quantity
      product.quantity -= dto.quantity;

      if (product.quantity <= product.max_quantity_notification) {

        reducedProduct.push({
          id: product.id,
          name: product.name,
          quantity: product.quantity,
          telegramGroupId: product.user.telegramGroupId,
        });
      }
    }

    // 💾 SAVE
    await manager.save(Sale, sales);
    await manager.save(Product, [...productMap.values()]);
    await manager.save(ProductBatch, [...updatedBatchesMap.values()]);

    // 📊 RESPONSE + STATISTICS
    const responseData: SaleResponseDto[] = [];
    let totalSum = 0;

    for (const sale of sales) {

      await this.statisticsService.createOrUpdate(manager, {
        userId,
        productId: sale.product.id,
        quantity: sale.quantity,
        totalSales: sale.selling_price,
        discount: sale.discount ?? 0,
        profit: (sale.selling_price - sale.purchase_price) * sale.quantity,
      });

      const total = this.calculateTotal(
        sale.selling_price,
        sale.quantity,
        sale.discount ?? 0,
      );

      totalSum += total;

      responseData.push({
        id: sale.id,
        quantity: sale.quantity,
        selling_price: sale.selling_price,
        discount: sale.discount,
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

  // 🔔 LOW STOCK QUEUE
  if (reducedProduct.length > 0) {
    await this.salelQueue.add('sale-created', reducedProduct);
  }

  return results;
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
      meta: {

        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }

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
      // const priceHistory = await manager.findOne(ProductBatch, {
      //   where: { id: sale.productBatch.id }

      // });
      // ✅ TO'G'RI:
      const priceHistory = await manager.findOne(ProductBatch, {
        where: { id: sale.productBatch.id }  // shu sotuvda ishlatilgan batch!
      });

      if (priceHistory) {
        priceHistory.quantity += sale.quantity;
        await manager.save(ProductBatch, priceHistory);
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


