import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductPriceHistory } from './entities/product-price-history.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { PriceHistoryDto } from './dto/price-history.dto';
import { PriceMode } from 'common/enums/priceMode.enum';
import { Unit } from 'src/units/entities/unit.entity';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationResponse } from 'common/interface/pagination.interface';
import { Sale } from 'src/sales/entities/sale.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    @InjectRepository(ProductPriceHistory)
    private priceHistoryRepository: Repository<ProductPriceHistory>,

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

        const unit = await manager.findOneOrFail(Unit, {
          where: { id: createData.unit_id }
        })
        // 1️⃣ Product yaratish
        const product = manager.create<Product, Partial<Product>>(Product, {
          name: createData.name,
          barcode: createData.barcode ?? null,
          quick_code: createData.quick_code ?? null,
          max_quantity_notification: createData.max_quantity_notification ?? null,
          quantity: createData.quantity ?? 0,
          // is_active: createData.is_active ?? true,
          user: { id: userId } as any,
          unit: unit,
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

  async createPriceHistory(priceData: PriceHistoryDto, userId: number) {
    try {
      return await this.dataSource.transaction(async (manager) => {

        const productRepository = manager.getRepository(Product);
        const priceHistoryRepository = manager.getRepository(ProductPriceHistory);

        // 🔒 Pessimistic locking — bir vaqtning o'zida boshqa transaction tegmaydi
        const product = await productRepository.findOne({
          where: { id: priceData.product_id, user: { id: userId } },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) {
          throw new NotFoundException('Mahsulot topilmadi yoki sizga tegishli emas');
        }

        // ❌ findOne → save emas!
        // ✔️ bitta SQL orqali quantity oshiramiz
        await manager
          .createQueryBuilder()
          .update(Product)
          .set({
            quantity: () => `quantity + ${Number(priceData.quantity)}`
          })
          .where({ id: product.id })
          .execute();

        // 📝 Price History yozamiz
        const priceHistory = priceHistoryRepository.create({
          ...priceData,
          product: { id: product.id },
        });

        await priceHistoryRepository.save(priceHistory);

        return { message: "Narx tarixi muvaffaqiyatli qo'shildi" };
      });

    } catch (error) {
      throw new InternalServerErrorException("Narx tarixi qo‘shishda xatolik yuz berdi");
    }
  }


  /**
 * Mahsulot narxini yangilash
 */
  async updatePriceHistory(
    productPriceId: number,
    userId: number,
    priceData: PriceHistoryDto,
  ) {
    return this.dataSource.transaction(async (manager) => {

      const productRepository = manager.getRepository(Product);
      const priceHistoryRepository = manager.getRepository(ProductPriceHistory);

      // 1️⃣ PriceHistory topamiz
      const priceHistory = await priceHistoryRepository.findOne({
        where: { id: productPriceId },
        relations: ['product'],
      });

      if (!priceHistory) {
        throw new NotFoundException('Narx tarixi topilmadi');
      }

      // 2️⃣ Sale jadvalida ishlatilganmi? (Agar ishlatilgan bo‘lsa o‘zgartirish taqiqlanadi)
      const saleUsed = await this.saleRepository.exists({
        where: { productPrice: { id: priceHistory.product.id } },
      });

      if (saleUsed) {
        throw new BadRequestException(
          `Bu narx tarixi sotuvda ishlatilgan — o'zgartirib bo'lmaydi`,
        );
      }

      const product = await productRepository.findOneOrFail({
        where: { id: priceHistory.product.id, user: { id: userId } },
        lock: { mode: 'pessimistic_write' },
      });

      const oldQty = Number(priceHistory.quantity);
      const newQty = Number(priceData.quantity);

      // Agar quantity o‘zgargan bo‘lsa productni ham yangilaymiz
      if (oldQty !== newQty) {

        product.quantity = Number(product.quantity) - oldQty + newQty;
        await productRepository.save(product);
      }

      // 3️⃣ Price historyni update qilamiz
      priceHistory.selling_price = priceData.selling_price;
      priceHistory.purchase_price = priceData.purchase_price;
      priceHistory.quantity = priceData.quantity;
      await priceHistoryRepository.save(priceHistory);

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

  async removePriceHistory(historyId: number, userId: number) {
    const history = await this.priceHistoryRepository.findOne({
      where: { id: historyId, product: { user: { id: userId } } },
    });

    if (!history) {
      throw new NotFoundException("Topilmadi yoki ruxsat yo‘q!");
    }

    await this.priceHistoryRepository.remove(history);
    return { message: 'O‘chirildi' };
  }



  /**
   * Mahsulot narx tarixini olish
   */
 async getPriceHistoryOne(historyId: number, userId: number) {
  const history = await this.priceHistoryRepository.findOne({
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
      id: historyId,
      product: { user: { id: userId } }
    },
    relations: {
      product: true
    }
  });

  if (!history) {
    throw new NotFoundException("Topilmadi yoki ruxsat yo‘q!");
  }

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
    const currentPrice = await this.priceHistoryRepository.find({
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
    // 1️⃣ Mahsulotlarni topamiz
    const qb = this.productRepository.createQueryBuilder('p')
      .where('p.userId = :userId', { userId });

    if (query && query.trim()) {
      qb.andWhere('(p.barcode LIKE :q OR p.quick_code LIKE :q OR p.name LIKE :q)', {
        q: `%${query}%`,
      });
    }

    // Tartiblash
    const products = await qb.orderBy('p.name', 'ASC').getMany();

    // 2️⃣ Har bir mahsulot uchun oxirgi 2 ta narxni olamiz va current_price tayinlaymiz
    for (const product of products) {
      const priceHistory = await this.priceHistoryRepository
        .createQueryBuilder('ph')
        .where('ph.product_id = :productId', { productId: product.id })
        .orderBy('ph.createdAt', 'DESC')
        .limit(2)
        .getMany();

      // current_price ni price_mode ga qarab aniqlash
      let current_price;
      if (product.price_mode === PriceMode.Current) {
        current_price = priceHistory[0]; // oxirgi narx
      } else {
        // old price, agar 2 ta mavjud bo'lsa ikkinchisini oladi, bo'lmasa birinchisini
        current_price = priceHistory[1] ?? priceHistory[0];
      }

      // product obyektiga qo'shamiz
      product.price_history = priceHistory;
      // product.current_price = current_price;
    }

    return products;
  }



  /**
   * Barcha aktiv mahsulotlarni olish
   */
  async findAll(userId: number, page: number = 1, limit: number = 10): Promise<PaginationResponse<Product>> {

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


    for(const product of products) {
      const priceHistory = await this.priceHistoryRepository
        .createQueryBuilder('ph')
        .where('ph.product_id = :productId', { productId: product.id })
        .orderBy('ph.createdAt', 'DESC')
        .limit(2)
        .getMany();

        product.price_history = product.price_mode === PriceMode.Current ?[ priceHistory[0]] : [priceHistory[1]] ;  
  
   }
    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }





  async deletePriceHistory(historyId: number, userId: number) {
    try {

      const history = await this.priceHistoryRepository.findOne({
        where: {
          id: historyId,
          product: { user: { id: userId } }
        },
        relations: {
          product: {
            user: true,
          },
        },
      });

      if (!history) {
        throw new NotFoundException('Bu tarix sizga tegishli emas yoki topilmadi');
      }

      await this.priceHistoryRepository.remove(history);
      return { message: 'O‘chirildi' };

    } catch (err) {
      throw new InternalServerErrorException(err);
    }
  }




}