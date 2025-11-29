import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) { }

  /**
   * 🧩 Bitta yoki ko‘p mahsulotni saqlaydi
   */
  async create(createData: any, userId: number) {

    try {
      // 1️⃣ Bitta product keldimi yoki array?
      const products = Array.isArray(createData) ? createData : [createData];

      // 2️⃣ Har bir productga user ni biriktiramiz
      const prepared = products.map((p) => ({
        ...p,
        user: { id: userId },
          unit: p.unit_id ? { id: p.unit_id } : null
      }));

      // 3️⃣ TypeORM create va save
      
      const created = this.productRepository.create(prepared);
      const saved = await this.productRepository.save(created);

      // 4️⃣ Agar bitta product yuborilgan bo‘lsa, obyekt qaytaramiz
      return Array.isArray(createData) ? saved : saved[0];

    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Bu nomdagi mahsulot allaqachon mavjud!');
      }

      // Boshqa noma’lum xatolar
      throw new InternalServerErrorException(error);
    }

  }

  /**
   * 🧩 Mahsulotni yangilash
   */
  async update(id: number, productData: any) {
    const existing = await this.productRepository.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Mahsulot topilmadi');

    // Float turlarni tekshiramiz
    const price = parseFloat(productData.price);
    const quantity = parseFloat(productData.quantity);

    if (isNaN(price) || isNaN(quantity)) {
      throw new BadRequestException('Narx yoki miqdor noto‘g‘ri formatda');
    }

    await this.productRepository.update(id, {
      ...productData,
      price,
      quantity,
    });

    return this.productRepository.findOne({ where: { id } });
  }

  /**
   * 🧩 Barcha mahsulotlar (foydalanuvchi bo‘yicha)
   */
  async findAll(userId: number) {
    return this.productRepository.find({
      where: { user: { id: userId } },
      order: { id: 'DESC' },
    });
  }

  /**
   * 🧩 Bitta mahsulot
   */
  async findOne(id: number, userId: number) {
    const product = await this.productRepository.findOne({ where: { id, user: { id: userId } } });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');
    return product;
  }

  /**
   * 🧩 Mahsulotni o‘chirish (rasmni ham)
   */
  async remove(id: number, fs: any, userId: number) {
    const product = await this.findOne(id, userId);

    if (product.image) {
      const path = `./uploads/${product.image.split('/').pop()}`;
      if (fs.existsSync(path)) fs.unlinkSync(path);
    }

    await this.productRepository.delete(id);
    return { message: 'Mahsulot o‘chirildi' };
  }

  /**
   * 🧩 Qidiruv (barcode, uid, name)
   */
  async searchProduct(userId: number, query: string) {
    const found = await this.productRepository.findOne({
      where: [
        { barcode: query, user: { id: userId } },
        { uid: query, user: { id: userId } },
        { name: query, user: { id: userId } },
      ],
    });

    if (!found) throw new NotFoundException('Hech qanday mos mahsulot topilmadi');
    return found;
  }
}
