
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Variant } from './entities/variant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import fs from 'fs';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>
  ) { }

  async create(createProductDto: CreateProductDto, userId: number) {
    const product = this.productRepository.create({
      ...createProductDto,
      user: { id: userId },
      variants: createProductDto.variants
    });
    return this.productRepository.save(product);
  }


  async update(id: number, productData: any) {
    const existing = await this.productRepository.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Mahsulot topilmadi');

    const { variants, ...rest } = productData;

    // 1. Mahsulotni yangilash
    await this.productRepository.update(id, rest);

    // 2. Eski variantlarni o‘chirish
    await this.variantRepository.delete({ product: { id } });

    // 3. Yangi variantlarni qo‘shish
    const newVariants = variants.map(v =>
      this.variantRepository.create({ ...v, product: { id } })
    );
    await this.variantRepository.save(newVariants);

    return await this.productRepository.findOne({
      where: { id },
      relations: ['variants'],
    });
  }




  async findOne(id: number) {
    return this.productRepository.findOne({ where: { id } });
  }

  async findAll(id: number) {
    return this.productRepository.find({ where: { user: { id: id } }, relations: ['variants'], });
  }

  async remove(id: number, fs: any) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['variants'],
    });

    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    // 1. Variantlar rasmlarini o‘chirish
    for (const variant of product.variants) {
      if (variant.image) {
        const path = `./uploads/${variant.image.split('/').pop()}`;
        if (fs.existsSync(path)) fs.unlinkSync(path);
      }
    }

    // 2. Variantlarni o‘chirish
    // await this.variantRepository.delete({ product: { id } });

    // 3. Productni o‘chirish
    await this.productRepository.delete(id);

    return { message: 'Mahsulot va variantlar o‘chirildi' };
  }
}

