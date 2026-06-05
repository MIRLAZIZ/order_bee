import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductBatch } from './entities/product-batch.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductBatchDto } from './dto/products-batch.dto';
import { PriceMode } from 'common/enums/priceMode.enum';
import { Unit } from 'src/units/entities/unit.entity';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationResponse } from 'common/interface/pagination.interface';
import { Sale } from 'src/sales/entities/sale.entity';
import { Category } from 'src/categories/entities/category.entity';
import { DeepPartial, Not } from 'typeorm';
import { BatchStatus } from 'common/enums/batch-status.enum';


@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    @InjectRepository(ProductBatch)
    private productBatchRepository: Repository<ProductBatch>,

    private dataSource: DataSource,

    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,

    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
  ) { }

  //* Mahsulot yaratish
  async create(createData: CreateProductDto, userId: number) {
    try {

      await this.dataSource.manager.transaction(async (manager) => {

        // 🔍 1. UNIQUE FIELDLARNI TEKSHIRISH
        const [nameExists, barcodeExists, quickCodeExists] = await Promise.all([

          manager.exists(Product, {
            where: {
              name: createData.name,
              user: { id: userId },
            }
          }),

          createData.barcode
            ? manager.exists(Product, {
              where: { barcode: createData.barcode, user: { id: userId } }
            })
            : false,

          createData.quick_code
            ? manager.exists(Product, {
              where: { quick_code: createData.quick_code, user: { id: userId } }
            })
            : false,
        ]);

        const errors: Record<string, string> = {};

        if (nameExists) {
          errors.name = 'Bu nom sizda allaqachon mavjud';
        }

        if (barcodeExists) {
          errors.barcode = 'Bu barcode allaqachon mavjud';
        }

        if (quickCodeExists) {
          errors.quick_code = 'Bu quick code allaqachon mavjud';
        }

        if (nameExists || barcodeExists || quickCodeExists) {
          throw new BadRequestException(errors);
        }

        const unit = await manager.findOneOrFail(Unit, {
          where: { id: createData.unit_id }
        });

        const productData: DeepPartial<Product> = {
          name: createData.name,
          barcode: createData.barcode,
          quick_code: createData.quick_code,
          max_quantity_notification: createData.max_quantity_notification ?? 0,
          quantity: createData.quantity ?? 0,
          user: { id: userId } as any,
          unit: unit,
          category: { id: createData.category_id } as Category,
          selling_price: createData.selling_price,
          pricing_strategy: createData.pricing_strategy,

        };

        const product = manager.create(Product, productData);
        const savedProduct = await manager.save(product);

        const deliveryPerItem = createData.quantity
          ? (createData.deliveryCost ?? 0) / createData.quantity
          : 0;

        const cost_price =
          (createData.purchase_price + deliveryPerItem) *
          (1 + (createData.vatRate ?? 0) / 100);

        const productBatch = manager.create(ProductBatch, {
          purchase_price: createData.purchase_price,
          selling_price: createData.selling_price,
          quantity: createData.quantity,
          product: savedProduct,
          deliveryCost: createData.deliveryCost ?? 0,
          costPrice: cost_price,
          vatRate: createData.vatRate ?? 0,
          remaining_quantity: createData.quantity
        });

        await manager.save(productBatch);
      });

      return { message: 'Mahsulot muvaffaqiyatli yaratildi' };

    } catch (error: any) {

      if (error.code === 'ER_DUP_ENTRY') {
        const constraint = error.sqlMessage.match(/for key '(.+?)'/)?.[1];

        switch (constraint) {
          case 'UNIQUE_PRODUCT_NAME_USER':
            throw new BadRequestException({
              field: 'name',
              message: 'Bu nom sizda mavjud'
            });

          case 'IDX_PRODUCT_BARCODE':
            throw new BadRequestException({
              field: 'barcode',
              message: 'Bu barcode mavjud'
            });

          case 'IDX_PRODUCT_QUICK_CODE':
            throw new BadRequestException({
              field: 'quick_code',
              message: 'Bu quick code mavjud'
            });

          default:
            throw new BadRequestException({
              message: 'Duplicate value'
            });
        }
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException();
    }
  }




  // async update(id: number, userId: number, dto: UpdateProductDto) {

  //   await this.dataSource.manager.transaction(async (manager) => {

  //     const product = await manager.findOneOrFail(Product, {
  //       where: { id, user: { id: userId } },
  //       relations: ['unit', 'category'],
  //     });

  //     const [activeBatch, pendingBatch] = await Promise.all([
  //       manager.findOne(ProductBatch, {
  //         where: { product: { id }, status: BatchStatus.ACTIVE },
  //       }),
  //       manager.findOne(ProductBatch, {
  //         where: { product: { id }, status: BatchStatus.PENDING },
  //         order: { createdAt: 'ASC' },
  //       }),
  //     ]);

  //     // ✅ Tekshirish product emas, BATCH darajasida
  //     const [activeBatchHasSales, productHasSales] = await Promise.all([
  //       activeBatch
  //         ? manager.exists(Sale, { where: { productBatch: { id: activeBatch.id } } })
  //         : false,
  //       manager.exists(Sale, { where: { product: { id } } }),
  //     ]);

  //     // ══════════════════════════════════════════════════
  //     // Product darajasidagi cheklovlar (sotuv bo'lsa)
  //     // ══════════════════════════════════════════════════
  //     if (productHasSales) {
  //       const errors: Record<string, string> = {};

  //       if (dto.unit_id !== undefined) errors.unit_id = "Sotuvlar mavjud! Unit o'zgartirib bo'lmaydi";
  //       if (dto.name !== undefined) errors.name = "Sotuvlar mavjud! Nom o'zgartirib bo'lmaydi";
  //       if (dto.barcode !== undefined) errors.barcode = "Sotuvlar mavjud! Barcode o'zgartirib bo'lmaydi";
  //       if (dto.quick_code !== undefined) errors.quick_code = "Sotuvlar mavjud! Quick code o'zgartirib bo'lmaydi";

  //       if (Object.keys(errors).length > 0) {
  //         throw new BadRequestException(errors);
  //       }
  //     } else {
  //       // ── Sotuv yo'q: unique tekshirish ──────────────
  //       const [nameExists, barcodeExists, quickCodeExists] = await Promise.all([
  //         dto.name
  //           ? manager.exists(Product, {
  //             where: { name: dto.name, user: { id: userId }, id: Not(id) },
  //           })
  //           : false,
  //         dto.barcode
  //           ? manager.exists(Product, {
  //             where: { barcode: dto.barcode, user: { id: userId }, id: Not(id) },
  //           })
  //           : false,
  //         dto.quick_code
  //           ? manager.exists(Product, {
  //             where: { quick_code: dto.quick_code, user: { id: userId }, id: Not(id) },
  //           })
  //           : false,
  //       ]);

  //       const conflictErrors: Record<string, string> = {};
  //       if (nameExists) conflictErrors.name = 'Bu nom allaqachon mavjud';
  //       if (barcodeExists) conflictErrors.barcode = 'Bu barcode allaqachon mavjud';
  //       if (quickCodeExists) conflictErrors.quick_code = 'Bu quick code allaqachon mavjud';

  //       if (Object.keys(conflictErrors).length > 0) {
  //         throw new ConflictException(conflictErrors);
  //       }

  //       if (dto.name !== undefined) product.name = dto.name;
  //       if (dto.barcode !== undefined) product.barcode = dto.barcode;
  //       if (dto.quick_code !== undefined) product.quick_code = dto.quick_code;

  //       if (dto.unit_id !== undefined) {
  //         product.unit = await manager.findOneOrFail(Unit, {
  //           where: { id: dto.unit_id },
  //         });
  //       }
  //     }

  //     // ══════════════════════════════════════════════════
  //     // Har doim ruxsat etilgan fieldlar
  //     // ══════════════════════════════════════════════════
  //     product.category = { id: dto.category_id } as Category;
  //     product.max_quantity_notification = dto.max_quantity_notification ?? 0;


  //     // ── pricing_strategy ──────────────────────────────
  //     if (dto.pricing_strategy !== undefined) {
  //       product.pricing_strategy = dto.pricing_strategy;

  //       if (dto.pricing_strategy === PriceMode.FIFO && activeBatch) {
  //         product.selling_price = activeBatch.selling_price;
  //       }
  //     }

  //     // ══════════════════════════════════════════════════
  //     // QUANTITY — batch darajasida tekshirish
  //     // ══════════════════════════════════════════════════
  //     // if (dto.quantity !== undefined) {
  //     //   if (!pendingBatch) {
  //     //     throw new BadRequestException(
  //     //       "PENDING batch topilmadi. Quantity o'zgartirish uchun pending batch kerak"
  //     //     );
  //     //   }

  //     //   // PENDING batchda sotuv bo'lmaydi (u hali active emas)
  //     //   // Shuning uchun bu yerda sotuv tekshirish shart emas ✅
  //     //   product.quantity = product.quantity - pendingBatch.quantity + dto.quantity;

  //     //   pendingBatch.quantity = dto.quantity;
  //     //   pendingBatch.remaining_quantity = dto.quantity;
  //     //   await manager.save(ProductBatch, pendingBatch);
  //     // }


  //     if (dto.quantity !== undefined) {
  //       if (!activeBatchHasSales) {
  //         if (activeBatch) {
  //           product.quantity = product.quantity - activeBatch!.quantity + dto.quantity;
  //           activeBatch.quantity = dto.quantity;
  //         }
  //       }
  //       else if (pendingBatch) {
  //         product.quantity = product.quantity - pendingBatch.quantity + dto.quantity;
  //         pendingBatch.quantity = dto.quantity;
  //         pendingBatch.remaining_quantity = dto.quantity;


  //       }
  //       else {
  //         throw new BadRequestException(
  //           "Maxsulot partiyalari sotuvda foydalanganligi uchun miqdorni o'zgartirib bo'lmaydi yangi partiya orqali qo'shing"
  //         );
  //       }

  //     }


  //     // ══════════════════════════════════════════════════
  //     // NARX — strategy + batch darajasida tekshirish
  //     // ══════════════════════════════════════════════════
  //     if (dto.selling_price !== undefined) {
  //       const strategy = dto.pricing_strategy ?? product.pricing_strategy;

  //       if (strategy === PriceMode.UNIFORM) {

  //         product.selling_price = dto.selling_price;

  //         // Active batch: sotuv bo'lsa ham narxini yangilaymiz
  //         // (narx o'zgarishi kelajakdagi sotuv uchun)
  //         if (activeBatch) {
  //           activeBatch.selling_price = dto.selling_price;
  //           await manager.save(ProductBatch, activeBatch);
  //         }

  //         // Pending batch: sotuv yo'q, har doim yangilanadi
  //         if (pendingBatch) {
  //           pendingBatch.selling_price = dto.selling_price;
  //           await manager.save(ProductBatch, pendingBatch);
  //         }

  //       } else if (strategy === PriceMode.FIFO) {

  //         if (activeBatch) {
  //           // Active batchda sotuv bo'lsa ham narx yangilanadi ✅
  //           // (faqat quantity cheklangan, narx emas)
  //           activeBatch.selling_price = dto.selling_price;
  //           product.selling_price = dto.selling_price;
  //           await manager.save(ProductBatch, activeBatch);

  //           // ⚠️ Pending batch narxi o'zgarmaydi (mustaqil)

  //         }
  //         // else if (pendingBatch) {
  //         //   pendingBatch.selling_price = dto.selling_price;
  //         //   product.selling_price = dto.selling_price;
  //         //   await manager.save(ProductBatch, pendingBatch);

  //         // } 

  //       }
  //     }

  //     await manager.save(Product, product);
  //   });

  //   return { message: 'Mahsulot muvaffaqiyatli yangilandi' };
  // }


  async update(id: number, userId: number, dto: UpdateProductDto) {
  await this.dataSource.transaction(async (manager) => {

    // ═══════════════════════════════════════════════
    // PRODUCT
    // ═══════════════════════════════════════════════
    const product = await manager.findOneOrFail(Product, {
      where: {
        id,
        user: { id: userId },
      },
      relations: ['unit', 'category'],
    });

    // ═══════════════════════════════════════════════
    // BATCHES
    // ═══════════════════════════════════════════════
    const [activeBatch, pendingBatch] = await Promise.all([
      manager.findOne(ProductBatch, {
        where: {
          product: { id },
          status: BatchStatus.ACTIVE,
        },
      }),

      manager.findOne(ProductBatch, {
        where: {
          product: { id },
          status: BatchStatus.PENDING,
        },
        order: {
          createdAt: 'ASC',
        },
      }),
    ]);

    // ═══════════════════════════════════════════════
    // SALES CHECK
    // ═══════════════════════════════════════════════
    const [activeBatchHasSales, productHasSales] = await Promise.all([

      activeBatch
        ? manager.exists(Sale, {
          where: {
            productBatch: { id: activeBatch.id },
          },
        })
        : false,

      manager.exists(Sale, {
        where: {
          product: { id },
        },
      }),
    ]);

    // ═══════════════════════════════════════════════
    // IMMUTABLE FIELD VALIDATION
    // ═══════════════════════════════════════════════
    await this.validateImmutableFields({
      dto,
      productHasSales,
    });

    // ═══════════════════════════════════════════════
    // UNIQUE VALIDATION
    // ═══════════════════════════════════════════════
    if (!productHasSales) {
      await this.validateUniqueFields({
        dto,
        manager,
        userId,
        productId: id,
      });
    }

    // ═══════════════════════════════════════════════
    // BASIC PRODUCT UPDATE
    // ═══════════════════════════════════════════════
    await this.updateBasicFields({
      dto,
      product,
      manager,
    });

    // ═══════════════════════════════════════════════
    // QUANTITY UPDATE
    // ═══════════════════════════════════════════════
    await this.handleQuantityUpdate({
      dto,
      product,
      activeBatch,
      pendingBatch,
      activeBatchHasSales,
      manager,
    });

    // ═══════════════════════════════════════════════
    // PRICING UPDATE
    // ═══════════════════════════════════════════════
    await this.handlePricingUpdate({
      dto,
      product,
      activeBatch,
      pendingBatch,
      manager,
    });

    // ═══════════════════════════════════════════════
    // SAVE
    // ═══════════════════════════════════════════════
    await Promise.all([
      activeBatch && manager.save(activeBatch),
      pendingBatch && manager.save(pendingBatch),
      manager.save(product),
    ]);
  });

  return {
    message: 'Mahsulot muvaffaqiyatli yangilandi',
  };
}




  async createProductBatch(batchData: CreateProductBatchDto, userId: number) {
    return await this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: batchData.product_id, user: { id: userId } },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) throw new NotFoundException('Mahsulot topilmadi');

      const activeBatch = await manager.findOne(ProductBatch, {
        where: { product: { id: product.id } }
      });

      const newBatch = manager.create(ProductBatch, {
        ...batchData,
        product: { id: product.id },
        is_active: !activeBatch,
        remaining_quantity: batchData.quantity,
      });

      await manager.save(newBatch);
      await manager.increment(Product, { id: product.id }, 'quantity', batchData.quantity);

      return { message: "Partiya qo'shildi" };
    });
  }


  async updateProductBatch(
    productBatchId: number,
    userId: number,
    priceData: CreateProductBatchDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);
      const productBatchRepository = manager.getRepository(ProductBatch);

      const productBatch = await productBatchRepository.findOne({
        where: { id: productBatchId },
        relations: ['product'],
      });

      if (!productBatch) {
        throw new NotFoundException('Narx tarixi topilmadi');
      }

      const saleUsed = await this.saleRepository.exists({
        where: { productBatch: { id: productBatch.id } },
      });

      if (saleUsed) {
        throw new BadRequestException(
          "Bu partiya tarixi sotuvda ishlatilgan — o'zgartirib bo'lmaydi."
        );
      }

      const product = await productRepository.findOneOrFail({
        where: { id: productBatch.product.id, user: { id: userId } },
        lock: { mode: 'pessimistic_write' },
      });

      const oldQty = Number(productBatch.quantity);
      const newQty = Number(priceData.quantity);

      if (oldQty !== newQty) {
        product.quantity = Number(product.quantity) - oldQty + newQty;
        await productRepository.save(product);
      }

      productBatch.selling_price = priceData.selling_price;
      productBatch.purchase_price = priceData.purchase_price;
      productBatch.quantity = priceData.quantity;
      await productBatchRepository.save(productBatch);

      return { message: 'Narx tarixi muvaffaqiyatli yangilandi' };
    });
  }


  async delete(productId: number, userId: number) {
    try {
      const product = await this.productRepository.findOne({
        where: { id: productId, user: { id: userId } },
      });

      if (!product) {
        throw new NotFoundException(
          'Mahsulot topilmadi',
        );
      }

      await this.productRepository.remove(product);

      return { message: "Mahsulot muvaffaqiyatli o'chirildi" };

    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Xatolik yuz berdi';
      throw new InternalServerErrorException(message);
    }
  }


  async getProductBatch(batchId: number, userId: number) {
    const batch = await this.productBatchRepository.findOne({
      select: {
        id: true,
        purchase_price: true,
        selling_price: true,
        quantity: true,
        createdAt: true,
        product: {
          id: true
        }
      },
      where: {
        id: batchId,
        product: { user: { id: userId } }
      },
      relations: {
        product: true
      }
    });

    if (!batch) {
      throw new NotFoundException("Topilmadi yoki ruxsat yo'q!");
    }

    return batch;
  }


  async findOne(productId: number, userId: number) {
    const product = await this.productRepository.findOne({
      where: { id: productId, user: { id: userId } },
      relations: ['unit', 'category'],
    });

    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }

    const currentPrice = await this.productBatchRepository.find({
      where: { product: { id: productId } },
      order: { createdAt: 'DESC' },
      take: 2,
    });

    return {
      ...product,
      current_price:
        product.pricing_strategy === PriceMode.UNIFORM
          ? currentPrice[0]
          : currentPrice[1] ?? currentPrice[0],
    };
  }


async search(userId: number, filters: {
  barcode?: string;
  name?: string;
  quickCode?: string;
}) {
  const { barcode, name, quickCode } = filters;

  const query = this.productRepository
    .createQueryBuilder('p')
    .where('p.user_id = :userId', { userId });

  if (barcode?.trim()) {
    query.andWhere('p.barcode = :barcode', { barcode: barcode.trim() });
  }

  if (quickCode?.trim()) {
    query.andWhere('p.quick_code = :quickCode', { quickCode: quickCode.trim() });
  }

  if (name?.trim()) {
    query.andWhere('p.name LIKE :name', { name: `${name.trim()}%` });
  }

  return await query
    .orderBy('p.name', 'ASC')
    .take(50)
    .getMany();
}


  async findAll(userId: number, page: number = 1, limit: number = 12): Promise<PaginationResponse<Product>> {
    const skip = (page - 1) * limit;

    const [products, total] = await this.productRepository.findAndCount({
      where: {
        user: { id: userId },
      },
      relations: ['unit'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    
    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }


  async deleteProductBatch(batchId: number, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const batch = await manager.findOne(ProductBatch, {
        where: { id: batchId, product: { user: { id: userId } } },
        relations: { product: true },
      });

      if (!batch) throw new NotFoundException('Topilmadi');

      const saleUsed = await this.saleRepository.exists({
        where: { productBatch: { id: batchId } }
      });

      if (saleUsed) {
        throw new BadRequestException("Sotuvda ishlatilgan batch o'chirib bo'lmaydi");
      }

      // FIX 3: template literal backticks added
      await manager.createQueryBuilder()
        .update(Product)
        .set({ quantity: () => `quantity - ${batch.quantity}` })
        .where({ id: batch.product.id })
        .execute();

      await manager.remove(batch);
      return { message: "O'chirildi" };
    });
  }


  


  async getLowStock(userId: number, page: number = 1): Promise<PaginationResponse<Product>> {
    const limit = 12;
    const skip = (page - 1) * limit;

    const [products, total] = await this.productRepository.findAndCount({
      where: {
        user: { id: userId },
        isLowStock: true,
      },
      order: { id: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }




  
// ═══════════════════════════════════════════════════
// VALIDATE IMMUTABLE FIELDS
// ═══════════════════════════════════════════════════

private async validateImmutableFields(params: {
  dto: UpdateProductDto;
  productHasSales: boolean;
}) {

  const { dto, productHasSales } = params;

  if (!productHasSales) return;

  const errors: Record<string, string> = {};

  if (dto.unit_id !== undefined) {
    errors.unit_id = "Sotuv mavjud! Unit o'zgartirib bo'lmaydi";
  }

  if (dto.name !== undefined) {
    errors.name = "Sotuv mavjud! Nom o'zgartirib bo'lmaydi";
  }

  if (dto.barcode !== undefined) {
    errors.barcode = "Sotuv mavjud! Barcode o'zgartirib bo'lmaydi";
  }

  if (dto.quick_code !== undefined) {
    errors.quick_code = "Sotuv mavjud! Quick code o'zgartirib bo'lmaydi";
  }

  if (Object.keys(errors).length > 0) {
    throw new BadRequestException(errors);
  }
}


// ═══════════════════════════════════════════════════
// UNIQUE VALIDATION
// ═══════════════════════════════════════════════════

private async validateUniqueFields(params: {
  dto: UpdateProductDto;
  manager: EntityManager;
  userId: number;
  productId: number;
}) {

  const {
    dto,
    manager,
    userId,
    productId,
  } = params;

  const [nameExists, barcodeExists, quickCodeExists] = await Promise.all([

    dto.name
      ? manager.exists(Product, {
        where: {
          name: dto.name,
          user: { id: userId },
          id: Not(productId),
        },
      })
      : false,

    dto.barcode
      ? manager.exists(Product, {
        where: {
          barcode: dto.barcode,
          user: { id: userId },
          id: Not(productId),
        },
      })
      : false,

    dto.quick_code
      ? manager.exists(Product, {
        where: {
          quick_code: dto.quick_code,
          user: { id: userId },
          id: Not(productId),
        },
      })
      : false,
  ]);

  const errors: Record<string, string> = {};

  if (nameExists) {
    errors.name = 'Bu nom allaqachon mavjud';
  }

  if (barcodeExists) {
    errors.barcode = 'Bu barcode allaqachon mavjud';
  }

  if (quickCodeExists) {
    errors.quick_code = 'Bu quick code allaqachon mavjud';
  }

  if (Object.keys(errors).length > 0) {
    throw new ConflictException(errors);
  }
}


// ═══════════════════════════════════════════════════
// BASIC FIELD UPDATE
// ═══════════════════════════════════════════════════

private async updateBasicFields(params: {
  dto: UpdateProductDto;
  product: Product;
  manager: EntityManager;
}) {

  const {
    dto,
    product,
    manager,
  } = params;

  if (dto.name !== undefined) {
    product.name = dto.name;
  }

  if (dto.barcode !== undefined) {
    product.barcode = dto.barcode;
  }

  if (dto.quick_code !== undefined) {
    product.quick_code = dto.quick_code;
  }

  if (dto.unit_id !== undefined) {
    product.unit = await manager.findOneOrFail(Unit, {
      where: {
        id: dto.unit_id,
      },
    });
  }

  if (dto.category_id !== undefined) {
    product.category = {
      id: dto.category_id,
    } as Category;
  }

  product.max_quantity_notification =
    dto.max_quantity_notification ?? 0;

  if (dto.pricing_strategy !== undefined) {
    product.pricing_strategy = dto.pricing_strategy;
  }
}


// ═══════════════════════════════════════════════════
// QUANTITY UPDATE
// ═══════════════════════════════════════════════════

private async handleQuantityUpdate(params: {
  dto: UpdateProductDto;
  product: Product;
  activeBatch: ProductBatch | null;
  pendingBatch: ProductBatch | null;
  activeBatchHasSales: boolean;
  manager: EntityManager;
}) {

  const {
    dto,
    product,
    activeBatch,
    pendingBatch,
    activeBatchHasSales,
  } = params;

  if (dto.quantity === undefined) return;

  // Active batch hali sotilmagan
  if (!activeBatchHasSales && activeBatch) {

    product.quantity =
      product.quantity -
      activeBatch.quantity +
      dto.quantity;

    activeBatch.quantity = dto.quantity;
    activeBatch.remaining_quantity = dto.quantity;

    return;
  }

  // Pending batch mavjud
  if (pendingBatch) {

    product.quantity =
      product.quantity -
      pendingBatch.quantity +
      dto.quantity;

    pendingBatch.quantity = dto.quantity;
    pendingBatch.remaining_quantity = dto.quantity;

    return;
  }

  throw new BadRequestException(
    "Mahsulot partiyalari sotuvda ishlatilgani uchun quantity o'zgartirib bo'lmaydi"
  );
}


// ═══════════════════════════════════════════════════
// PRICING UPDATE
// ═══════════════════════════════════════════════════

private async handlePricingUpdate(params: {
  dto: UpdateProductDto;
  product: Product;
  activeBatch: ProductBatch | null;
  pendingBatch: ProductBatch | null;
  manager: EntityManager;
}) {

  const {
    dto,
    product,
    activeBatch,
    pendingBatch,
  } = params;

  if (dto.selling_price === undefined) return;

  const strategy =
    dto.pricing_strategy ??
    product.pricing_strategy;

  // ═══════════════════════════════════════════════
  // UNIFORM
  // ═══════════════════════════════════════════════
  if (strategy === PriceMode.UNIFORM) {

    product.selling_price = dto.selling_price;

    if (activeBatch) {
      activeBatch.selling_price = dto.selling_price;
    }

    if (pendingBatch) {
      pendingBatch.selling_price = dto.selling_price;
    }

    return;
  }

  // ═══════════════════════════════════════════════
  // FIFO
  // ═══════════════════════════════════════════════
  if (strategy === PriceMode.FIFO) {

    if (!activeBatch) return;

    activeBatch.selling_price = dto.selling_price;

    product.selling_price = dto.selling_price;
  }
}


}


// agar pricing_strategy uniform bo'lsa  narxlar product repodan  olinishi kerak
// agar pricing_strategy fifo bo'lsa  narxlar product_batch enx oxirgisidan olinishi kerak repodan olinishi kerak
// 

