import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductPriceHistory } from './entities/product-price-history.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { PriceHistoryDto } from './dto/price-history.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    @InjectRepository(ProductPriceHistory)
    private priceHistoryRepository: Repository<ProductPriceHistory>,

    private dataSource: DataSource,
  ) { }

  //* Mahsulot yaratish
  async create(createData: CreateProductDto, userId: number) {
    try {
      await this.dataSource.manager.transaction(async (manager) => {
        // 1️⃣ Product yaratish
        const product = manager.create<Product, Partial<Product>>(Product, {
          name: createData.name,
          barcode: createData.barcode ?? null,
          quick_code: createData.quick_code ?? null,
          max_quantity_notification: createData.max_quantity_notification ?? null,
          quantity: createData.quantity ?? 0,
          is_active: createData.is_active ?? true,
          user: { id: userId } as any,
          unit: { id: createData.unit_id } as any,
        });

        const savedProduct = await manager.save(product);

        // 2️⃣ Price history yaratish
        const priceHistory = manager.create(ProductPriceHistory, {
          purchase_price: createData.purchase_price,
          selling_price: createData.selling_price,
          quantity: createData.quantity,
          product: savedProduct,
        });

        await manager.save(priceHistory);


      });

      return { message: 'Mahsulot muvaffaqiyatli yaratildi' };
    } catch (error) {
      // Duplicate entry yoki boshqa xatolarni catch qilamiz
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          error.message || 'Bu nom, barcode yoki quick_code bilan mahsulot allaqachon mavjud!',
        );
      }
      throw new InternalServerErrorException(error);
    }
  }

  // narx tarixini qoshish


async createPriceHistory(priceData: PriceHistoryDto, userId: number) {
  try {

    return await this.dataSource.transaction(async (manager) => {

      // ❗ Manager orqali repo olish kerak
      const productRepository = manager.getRepository(Product);
      const priceHistoryRepository = manager.getRepository(ProductPriceHistory);

      // ❗ findOneOrFail ishlatish tavsiya – o‘zida xatoni beradi
      const product = await productRepository.findOneOrFail({
        where: {
          id: priceData.product_id,
          user: { id: userId }
        },
        lock: {mode: "pessimistic_write"}
      });

      if (!product) {
        throw new NotFoundException('Mahsulot topilmadi yoki sizga tegishli emas');
      }

      // Mahsulot miqdorini va narx holatini yangilash
      product.quantity = Number(product.quantity) + Number(priceData.quantity);
      product.price_mode = priceData.price_mode ?? product.price_mode;

      await productRepository.save(product);

      // Yangi narx tarixini yaratamiz
      const priceHistory = priceHistoryRepository.create({
        ...priceData,
        product // RELATION
      });

      await priceHistoryRepository.save(priceHistory);

      return { message: "Narx tarixi muvaffaqiyatli qo'shildi" };
    });

  } catch (error) {
  
    throw new InternalServerErrorException('Narx tarixi qo‘shishda xatolik yuz berdi');
  }
}




  /**
   * Mahsulot narxini yangilash
   * Yangi price history yozuvi yaratiladi
   */
  // async updatePrice(
  //   productId: number,
  //   userId: number,
  //   priceData: UpdatePriceDto,
  // ) {
  //   try {
  //     // Mahsulotni tekshirish
  //     const product = await this.productRepository.findOne({
  //       where: { id: productId, user: { id: userId } },
  //     });

  //     if (!product) {
  //       throw new NotFoundException(
  //         'Mahsulot topilmadi yoki sizga tegishli emas',
  //       );
  //     }

  //     // Hech bo'lmaganda bitta narx berilganligini tekshirish
  //     if (!priceData.purchase_price && !priceData.selling_price) {
  //       throw new BadRequestException(
  //         'Kamida bitta narx (purchase_price yoki selling_price) berilishi kerak',
  //       );
  //     }

  //     // Oxirgi narxni olish
  //     const lastPrice = await this.priceHistoryRepository.findOne({
  //       where: { product: { id: productId } },
  //       order: { createdAt: 'DESC' },
  //     });

  //     // Yangi price history yaratish
  //     const priceHistory = this.priceHistoryRepository.create({
  //       purchase_price:
  //         priceData.purchase_price ?? lastPrice?.purchase_price ?? 0,
  //       selling_price:
  //         priceData.selling_price ?? lastPrice?.selling_price ?? 0,
  //       product: product,
  //       createdAt: new Date(),
  //     });

  //     await this.priceHistoryRepository.save(priceHistory);

  //     return {
  //       message: 'Narx muvaffaqiyatli yangilandi',
  //       priceHistory,
  //     };
  //   } catch (error) {
  //     if (
  //       error instanceof NotFoundException ||
  //       error instanceof BadRequestException
  //     ) {
  //       throw error;
  //     }
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

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

      // Sale'da ishtirok etganligini SQL orqali tekshirish
      const result = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM sale WHERE product_id = ?',
        [productId],
      );

      const salesCount = result[0].count;

      if (salesCount > 0) {
        throw new BadRequestException(
          `Bu mahsulotni o'chirib bo'lmaydi, chunki ${salesCount} ta savdo operatsiyasida ishtirok etgan`,
        );
      }

      // Price history ham avtomatik o'chiriladi (onDelete: CASCADE)
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

  /**
   * Mahsulotni yangilash (narxdan tashqari)
   */
  // async update(
  //   productId: number,
  //   userId: number,
  //   updateData: UpdateProductDto,
  // ) {
  //   try {
  //     const product = await this.productRepository.findOne({
  //       where: { id: productId, user: { id: userId } },
  //     });

  //     if (!product) {
  //       throw new NotFoundException('Mahsulot topilmadi');
  //     }

  //     // Narxdan tashqari maydonlarni yangilash
  //     const updatedProduct = await this.productRepository.save({
  //       ...product,
  //       name: updateData.name ?? product.name,
  //       barcode: updateData.barcode ?? product.barcode,
  //       quick_code: updateData.quick_code ?? product.quick_code,
  //       max_quantity_notification:
  //         updateData.max_quantity_notification ??
  //         product.max_quantity_notification,
  //       quantity: updateData.quantity ?? product.quantity,
  //       description: updateData.description ?? product.description,
  //       is_active: updateData.is_active ?? product.is_active,
  //       unit: updateData.unit_id ? { id: updateData.unit_id } : product.unit,
  //     });

  //     // Narx bilan qaytarish
  //     return this.findOne(updatedProduct.id, userId);
  //   } catch (error) {
  //     if (error.code === 'ER_DUP_ENTRY') {
  //       throw new ConflictException(
  //         'Bu nomdagi yoki kodi bor mahsulot allaqachon mavjud!',
  //       );
  //     }
  //     if (error instanceof NotFoundException) {
  //       throw error;
  //     }
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  /**
   * Mahsulot narx tarixini olish
   */
  async getPriceHistory(productId: number, userId: number) {
    const product = await this.productRepository.findOne({
      where: { id: productId, user: { id: userId } },
    });

    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }

    const history = await this.priceHistoryRepository.find({
      where: { product: { id: productId } },
      order: { createdAt: 'DESC' },
    });

    return history;
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
    const currentPrice = await this.priceHistoryRepository.findOne({
      where: { product: { id: productId } },
      order: { createdAt: 'DESC' },
    });

    return {
      ...product,
      current_price: currentPrice || null,
    };
  }

  /**
   * Quick code yoki barcode orqali mahsulot topish
   * Kassa uchun eng muhim funksiya!
   */
  async findByCodeOrBarcode(code: string, userId: number) {
    if (!code || code.trim() === '') {
      throw new BadRequestException('Kod kiritilmagan');
    }

    const normalizedCode = code.trim().toUpperCase();

    // Birinchi quick_code bo'yicha qidirish
    let product = await this.productRepository.findOne({
      where: {
        quick_code: normalizedCode,
        user: { id: userId },
        is_active: true,
      },
      relations: ['unit'],
    });

    // Agar topilmasa, barcode bo'yicha qidirish
    if (!product) {
      product = await this.productRepository.findOne({
        where: {
          barcode: code,
          user: { id: userId },
          is_active: true,
        },
        relations: ['unit'],
      });
    }

    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }

    // Oxirgi narxni ham qo'shib beramiz
    const currentPrice = await this.priceHistoryRepository.findOne({
      where: { product: { id: product.id } },
      order: { createdAt: 'DESC' },
    });

    return {
      ...product,
      current_price: currentPrice || null,
    };
  }

  /**
   * Barcha aktiv mahsulotlarni olish
   */
  async findAll(userId: number) {
    const products = await this.productRepository.find({
      where: {
        user: { id: userId },
        is_active: true,
      },
      relations: ['unit'],
      order: { name: 'ASC' },
    });

    // Har bir mahsulot uchun oxirgi narxni qo'shamiz
    const productsWithPrices = await Promise.all(
      products.map(async (product) => {
        const currentPrice = await this.priceHistoryRepository.findOne({
          where: { product: { id: product.id } },
          order: { createdAt: 'DESC' },
        });
        return {
          ...product,
          current_price: currentPrice || null,
        };
      }),
    );

    return productsWithPrices;
  }
}