
import {
  Controller,
  Post,
  Body,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Req,
  Get,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { Request } from 'express';
import { multerOptions } from 'common/utils/multer-options';
import { ProductsService } from './products.service';


@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {

    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  @Post()
  @UseInterceptors(AnyFilesInterceptor(multerOptions))
  async createProduct(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body: any,
    @Req() req: Request
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    let rawVariants = body.variants;
    if (typeof rawVariants === 'string') {
      try {
        rawVariants = JSON.parse(rawVariants);
      } catch (err) {
        throw new BadRequestException('variants noto‘g‘ri formatda');
      }
    }

    const variants = rawVariants.map((v, index) => {
      const file = files.find(f => f.fieldname === `variants[${index}][image]`);
      const imageUrl = file ? `${baseUrl}/uploads/${file.filename}` : null;
      return {
        title: v.title,
        price: parseFloat(v.price),
        quantity: parseFloat(v.quantity),
        image: imageUrl,
      };
    });

    const product = {
      name: body.name,
      category_id: body.category_id,
      description: body.description,
      type: body.type,
      code: body.code,
      type1: body.type1,
      variants
    };

    return this.productsService.create(product);
  }




  @Put(':id')
  @UseInterceptors(AnyFilesInterceptor(multerOptions))
  async updateProduct(
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body: any,
    @Req() req: Request
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    let rawVariants = body.variants;
    // let rawVariants = body.variants;

    if (!rawVariants) {
      throw new BadRequestException('variants yuborilmadi');
    }

    if (typeof rawVariants === 'string') {
      try {
        rawVariants = JSON.parse(rawVariants);
      } catch (err) {
        throw new BadRequestException('variants noto‘g‘ri formatda');
      }
    }

    const variants = rawVariants.map((v, index) => {
      const file = files.find(f => f.fieldname === `variants[${index}][image]`);
      const imageUrl = file ? `${baseUrl}/uploads/${file.filename}` : v.image; // agar yangi rasm bo‘lmasa eski rasm
      const price = parseFloat(v.price);
      const quantity = parseFloat(v.quantity);

      if (isNaN(price) || isNaN(quantity)) {
        throw new BadRequestException(`Variant ${index + 1} uchun price yoki quantity noto‘g‘ri`);
      }

      return {
        id: v.id, // agar mavjud variantlar update qilinayotgan bo‘lsa
        title: v.title,
        price,
        quantity,
        image: imageUrl,
      };
    });

    const product = {
      name: body.name,
      category_id: body.category_id,
      description: body.description,
      type: body.type,
      code: body.code,
      type1: body.type1,
      variants
    };

    return this.productsService.update(+id, product);
  }





  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Req() req: Request) {
    const id = +req.params['id'];
    return this.productsService.findOne(id);
  }


    @Delete(':id')
  async remove(@Param('id') id: string) {
    const fs = await import('fs');
    return this.productsService.remove(+id, fs);
  }
}
