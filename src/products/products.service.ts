import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like, In } from 'typeorm';
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
import { log } from 'console';

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

        // name + user (agar shunaqa unique bo‘lsa)
        manager.exists(Product, {
          where: {
            name: createData.name,
            user: { id: userId }
          }
        }),

        // barcode (agar bor bo‘lsa)
        createData.barcode
          ? manager.exists(Product, {
              where: { barcode: createData.barcode, user: { id: userId } }
            })
          : false,

        // quick_code (agar bor bo‘lsa)
        createData.quick_code
          ? manager.exists(Product, {
              where: { quick_code: createData.quick_code, user: { id: userId } }
            })
          : false,
      ]);

      // ❗ ERROR YIG‘ISH
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

      if (Object.keys(errors).length) {
        throw new BadRequestException(...Object.values(errors));
      }



        const unit = await manager.findOneOrFail(Unit, {
          where: { id: createData.unit_id }
        })
        // 1️⃣ Product yaratish
        const product = manager.create<Product, Partial<Product>>(Product, {
          name: createData.name,
          barcode: createData.barcode ?? null,
          quick_code: createData.quick_code ?? null,
          max_quantity_notification: createData.max_quantity_notification ?? 0,
          quantity: createData.quantity ?? 0,
          // is_active: createData.is_active ?? true,
          user: { id: userId } as any,
          unit: unit,
          category: { id: createData.category_id } as Category
        });

        const savedProduct = await manager.save(product);

        const deliveryPerItem = createData.quantity
          ? createData.deliveryCost / createData.quantity
          : 0;

        const cost_price =
          (createData.purchase_price + deliveryPerItem) *
          (1 + createData.vatRate / 100);

        // 2️⃣ Product batch yaratish
        const productBatch = manager.create(ProductBatch, {
          purchase_price: createData.purchase_price,
          selling_price: createData.selling_price,
          quantity: createData.quantity,
          product: savedProduct,
          deliveryCost: createData.deliveryCost ?? 0,
          costPrice: cost_price,
          vatRate: createData.vatRate ?? 0




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
  

  // narx tarixini qoshish




  async update(id: number, userId: number, updateProductDto: UpdateProductDto): Promise<{ message: string }> {
    // Mahsulotni topish
    const product = await this.productRepository.findOneOrFail({
      where: { id, user: { id: userId } }
    });

    // Shu mahsulotga bog‘langan birorta sotuv bor yoki yo‘qligini tekshiramiz
    const hasSales = await this.saleRepository.exists({
      where: { product: { id } }
    });

    // UNIT update bo'lishi kerakmi?
    if (updateProductDto.unit_id) {
      if (hasSales) {
        // Sotuvlar mavjud bo‘lsa - unitni o‘zgartirishga ruxsat bermaymiz
        throw new BadRequestException(
          "Bu mahsulotga sotuvlar mavjud! Unitni o‘zgartirib bo‘lmaydi."
        );
      }

      // Sotuv bo‘lmasa unitni o‘zgartirish mumkin
      const unit = await this.unitRepository.findOneOrFail({
        where: { id: updateProductDto.unit_id }
      });
      product.unit = unit;
    }

    // Boshqa maydonlarni yangilash
    Object.assign(product, updateProductDto);

    // Saqlash
    await this.productRepository.save(product);

    return { message: "Mahsulot muvaffaqiyatli yangilandi" };
  }

  async createProductBatch(priceData: CreateProductBatchDto, userId: number) {
    try {
      return await this.dataSource.transaction(async (manager) => {

        const productRepository = manager.getRepository(Product);
        const productBatchRepository = manager.getRepository(ProductBatch);

        // 🔒 Pessimistic locking — bir vaqtning o'zida boshqa transaction tegmaydi
        const product = await productRepository.findOne({
          where: { id: priceData.product_id, user: { id: userId } },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) {
          throw new NotFoundException('Mahsulot topilmadi yoki sizga tegishli emas');
        }

        // bitta SQL orqali quantity oshiramiz
        await manager
          .createQueryBuilder()
          .update(Product)
          .set({
            quantity: () => `quantity + ${Number(priceData.quantity)}`
          })
          .where({ id: product.id })
          .execute();

        // 📝 Product batch yozamiz
        const productBatch = productBatchRepository.create({
          ...priceData,
          product: { id: product.id },
        });

        await productBatchRepository.save(productBatch);

        return { message: "Narx tarixi muvaffaqiyatli qo'shildi" };
      });

    } catch (error) {
      throw new InternalServerErrorException("Narx tarixi qo‘shishda xatolik yuz berdi");
    }
  }


  /**
 * Mahsulot batch yangilash
 */
  async updateProductBatch(
    productPriceId: number,
    userId: number,
    priceData: CreateProductBatchDto,
  ) {
    return this.dataSource.transaction(async (manager) => {

      const productRepository = manager.getRepository(Product);
      const productBatchRepository = manager.getRepository(ProductBatch);

      // 1️⃣ productBatch topamiz
      const productBatch = await productBatchRepository.findOne({
        where: { id: productPriceId },
        relations: ['product'],
      });

      if (!productBatch) {
        throw new NotFoundException('Narx tarixi topilmadi');
      }

      // 2️⃣ Sale jadvalida ishlatilganmi? (Agar ishlatilgan bo‘lsa o‘zgartirish taqiqlanadi)
      const saleUsed = await this.saleRepository.exists({
        where: { productPrice: { id: productBatch.product.id } },
      });

      if (saleUsed) {
        throw new BadRequestException(
          `Bu narx tarixi sotuvda ishlatilgan — o'zgartirib bo'lmaydi`,
        );
      }

      const product = await productRepository.findOneOrFail({
        where: { id: productBatch.product.id, user: { id: userId } },
        lock: { mode: 'pessimistic_write' },
      });

      const oldQty = Number(productBatch.quantity);
      const newQty = Number(priceData.quantity);

      // Agar quantity o‘zgargan bo‘lsa productni ham yangilaymiz
      if (oldQty !== newQty) {

        product.quantity = Number(product.quantity) - oldQty + newQty;
        await productRepository.save(product);
      }

      // 3️⃣ product batch ni update qilamiz
      productBatch.selling_price = priceData.selling_price;
      productBatch.purchase_price = priceData.purchase_price;
      productBatch.quantity = priceData.quantity;
      await productBatchRepository.save(productBatch);

      return {
        message: 'Narx tarixi muvaffaqiyatli yangilandi',
      };
    });
  }



  /**
   * Mahsulotni o'chirish
   * Agar sale'da ishtirok etgan bo'lsa, o'chirib bo'lmaydi
   */
  async delete(productId: number, userId: number) {
    try {
      // Mahsulotni tekshirish
      const product = await this.productRepository.findOne({
        where: { id: productId, user: { id: userId } },
      });

      if (!product) {
        throw new NotFoundException(
          'Mahsulot topilmadi yoki sizga tegishli emas',
        );
      }





      // Product batchni ham avtomatik o'chiriladi (onDelete: CASCADE)
      await this.productRepository.remove(product);

      return {
        message: "Mahsulot muvaffaqiyatli o'chirildi",
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async removeProductBatch(batchId: number, userId: number) {
    const batch = await this.productBatchRepository.findOne({
      where: { id: batchId, product: { user: { id: userId } } },
    });

    if (!batch) {
      throw new NotFoundException("Topilmadi yoki ruxsat yo‘q!");
    }

    await this.productBatchRepository.remove(batch);
    return { message: 'O‘chirildi' };
  }



  /**
   * Mahsulot narx tarixini olish
   */
  async getProductBatch(batchId: number, userId: number) {
    const batch = await this.productBatchRepository.findOne({
      select: {
        id: true,
        purchase_price: true,
        selling_price: true,
        quantity: true,
        createdAt: true,
        product: {
          id: true // faqat id qaytadi
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
      throw new NotFoundException("Topilmadi yoki ruxsat yo‘q!");
    }

    return batch;
  }


  /**
   * Bitta mahsulotni olish (oxirgi narx bilan)
   */
  async findOne(productId: number, userId: number) {
    const product = await this.productRepository.findOne({
      where: { id: productId, user: { id: userId } },
      relations: ['unit'],
    });

    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }


    // Oxirgi narxni olish
    const currentPrice = await this.productBatchRepository.find({
      where: { product: { id: productId } },
      order: { createdAt: 'DESC' },
      take: 2,
    });

    return {
      ...product,
      current_price: product.price_mode === PriceMode.Current ? currentPrice[0] : currentPrice[1] ?? currentPrice[0],
    };
  }





  async search(userId: number, query?: string) {
    if (!query || !query.trim()) return [];


    const q = query.trim();

    const batchJoin = `
    ph.id IN (
      SELECT id FROM (
        SELECT
          ph2.id,
          ROW_NUMBER() OVER (
            PARTITION BY ph2.product_id
            ORDER BY ph2.createdAt DESC
          ) AS rn,
          ph2.product_id
        FROM product_batch ph2
      ) ranked
      WHERE
        ranked.product_id = p.id
        AND ranked.rn = CASE
          WHEN p.price_mode = 'current' THEN 1
          ELSE 2
        END
    )
  `;

    // 1️⃣ Exact search
    let products = await this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.product_batch', 'ph', batchJoin)
      .where('p.user_id = :userId', { userId })
      .andWhere('(p.barcode = :q OR p.quick_code = :q)', { q })
      .take(5)
      .getMany();

    // 2️⃣ Fallback
    if (products.length === 0) {
      products = await this.productRepository
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.product_batch', 'ph', batchJoin)
        .where('p.user_id = :userId', { userId })
        .andWhere('p.name LIKE :name', { name: `${q}%` })
        .orderBy('p.name', 'ASC')
        .take(20)
        .getMany();
    }

    return products;
  }






  /**
   * Barcha aktiv mahsulotlarni olish
   */
  async findAll(userId: number, page: number = 1, limit: number = 12): Promise<PaginationResponse<Product>> {

    const skip = (page - 1) * limit;

    const [products, total] = await this.productRepository.findAndCount({
      where: {
        user: { id: userId },
      },
      relations: ['unit'],
      order: { name: 'DESC' },
      skip,
      take: limit,
    });


    for (const product of products) {
      const productBatches = await this.productBatchRepository
        .createQueryBuilder('ph')
        .where('ph.product_id = :productId', { productId: product.id })
        .orderBy('ph.createdAt', 'DESC')
        .limit(2)
        .getMany();

      if (productBatches.length > 1) {

        product.product_batches = product.price_mode === PriceMode.Current ? [productBatches[0]] : [productBatches[1]];
      }
      product.product_batches = [productBatches[0]];




    }
    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }





  async deleteProductBatch(batchId: number, userId: number) {
    
    try {

      const batch = await this.productBatchRepository.findOne({
        where: {
          id: batchId,
          product: { user: { id: userId } }
        },
        relations: {
          product: {
            user: true,
          },
        },
      });

      if (!batch) {
        throw new NotFoundException('Bu tarix sizga tegishli emas yoki topilmadi');
      }

      await this.productBatchRepository.remove(batch);
      return { message: 'O‘chirildi' };


    } catch (err) {
      throw new InternalServerErrorException(err);
    }
  }

  async getLastTwoPriceHistories(productId: number, userId: number) {
    return await this.productBatchRepository.find({
      where: {
        product: { id: productId, user: { id: userId } },
      },
      take: 2,
      order: { createdAt: 'DESC' },
    });
  }



  async getLowStock(userId: number, page: number = 1): Promise<PaginationResponse<Product>> {
    const limt = 12

    const skip = (page - 1) * limt

    const [products, total] = await this.productRepository.findAndCount({
      where: {
        user: {
          id: userId
        },
        isLowStock: true,
      },
      order: {
        id: 'DESC'
      },
      skip,
      take: limt

    })

    return {
      data: products,
      total,
      page,
      limit: limt,
      totalPages: Math.ceil(total / limt),
    };


  }





}