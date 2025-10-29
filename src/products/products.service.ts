
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Product } from './entities/product.entity';
// import { Variant } from './entities/variant.entity';
// import { CreateProductDto } from './dto/create-product.dto';

// @Injectable()
// export class ProductsService {
//   constructor(
//     @InjectRepository(Product)
//     private readonly productRepository: Repository<Product>,
//     @InjectRepository(Variant)
//     private readonly variantRepository: Repository<Variant>
//   ) { }

//   async create(createProductDto: CreateProductDto, userId: number) {
//     const product = this.productRepository.create({
//       ...createProductDto,
//       user: { id: userId },
//       variants: createProductDto.variants
//     });
    
//     return this.productRepository.save(product);
//   }


//   async update(id: number, productData: any) {
//     const existing = await this.productRepository.findOne({ where: { id } });
//     if (!existing) throw new NotFoundException('Mahsulot topilmadi');

//     const { variants, ...rest } = productData;

//     // 1. Mahsulotni yangilash
//     await this.productRepository.update(id, rest);

//     // 2. Eski variantlarni o‘chirish
//     await this.variantRepository.delete({ product: { id } });

//     // 3. Yangi variantlarni qo‘shish
//     const newVariants = variants.map(v =>
//       this.variantRepository.create({ ...v, product: { id } })
//     );
//     await this.variantRepository.save(newVariants);

//     return await this.productRepository.findOne({
//       where: { id },
//       relations: ['variants'],
//     });
//   }




//   async findOne(id: number) {
//     return this.productRepository.findOne({ where: { id }, relations: ['variants'], });
//   }

//   async findAll(id: number) {
//     return this.productRepository.find({ where: { user: { id: id } }, relations: ['variants'], });
//   }

//   async remove(id: number, fs: any) {
//     const product = await this.productRepository.findOne({
//       where: { id },
//       relations: ['variants'],
//     });

//     if (!product) throw new NotFoundException('Mahsulot topilmadi');

//     // 1. Variantlar rasmlarini o‘chirish
//     for (const variant of product.variants) {
//       if (variant.image) {
//         const path = `./uploads/${variant.image.split('/').pop()}`;
//         if (fs.existsSync(path)) fs.unlinkSync(path);
//       }
//     }

//     // 2. Variantlarni o‘chirish
//     // await this.variantRepository.delete({ product: { id } });

//     // 3. Productni o‘chirish
//     await this.productRepository.delete(id);

//     return { message: 'Mahsulot va variantlar o‘chirildi' };
//   }


//   async searchProduct(userId: number, query: string) {
//   // 🔍 variant ichidan qidiramiz
  
//   const variant = await this.variantRepository.findOne({
//     where: [
//       { barcode: query, product: { user: { id: userId } } },
//       { uid: query, product: { user: { id: userId } } },
//       { name: query, product: { user: { id: userId } } },
//     ],
//     relations: ['product'], // product ma’lumotini ham olish
//   });

//   if (!variant) {
//     throw new NotFoundException('Hech qanday mos variant topilmadi');
//   }

//   return variant;
// }

// }

import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

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
    }));

    // 3️⃣ TypeORM create va save
    const created = this.productRepository.create(prepared);
    const saved = await this.productRepository.save(created);

    // 4️⃣ Agar bitta product yuborilgan bo‘lsa, obyekt qaytaramiz
    return Array.isArray(createData) ? saved : saved[0];

    } catch (error) {
if (error.code === 'ER_DUP_ENTRY') {
        throw new  ConflictException('Bu nomdagi mahsulot allaqachon mavjud!');
      }

      // Boshqa noma’lum xatolar
      throw new  InternalServerErrorException('Mahsulotni saqlashda xatolik yuz berdi.');    }
 
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
  async findOne(id: number) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');
    return product;
  }

  /**
   * 🧩 Mahsulotni o‘chirish (rasmni ham)
   */
  async remove(id: number, fs: any) {
    const product = await this.findOne(id);

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
