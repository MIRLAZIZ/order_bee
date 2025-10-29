
// import {
//   Controller,
//   Post,
//   Body,
//   UploadedFiles,
//   UseInterceptors,
//   BadRequestException,
//   Req,
//   Get,
//   Put,
//   Param,
//   Delete,
//   Query,
// } from '@nestjs/common';
// import { AnyFilesInterceptor } from '@nestjs/platform-express';
// import * as fs from 'fs';
// import { Request } from 'express';
// import { multerOptions } from 'common/utils/multer-options';
// import { ProductsService } from './products.service';


// @Controller('products')
// export class ProductsController {
//   constructor(private readonly productsService: ProductsService) {

//     const uploadDir = './uploads';
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }
//   }

//   @Post()
//   @UseInterceptors(AnyFilesInterceptor(multerOptions))
//   async createProduct(
//     @UploadedFiles() files: Array<Express.Multer.File>,
//     @Body() body: any,
//     @Req() req: Request
//   ) {
//     const baseUrl = `${req.protocol}://${req.get('host')}`;

//     let rawVariants = body.variants;
//     if (typeof rawVariants === 'string') {
//       try {
//         rawVariants = JSON.parse(rawVariants);
//       } catch (err) {
//         throw new BadRequestException('variants noto‘g‘ri formatda');
//       }
//     }

//     const variants = rawVariants.map((v, index) => {
//       const file = files.find(f => f.fieldname === `variants[${index}][image]`);
//       const imageUrl = file ? `${baseUrl}/uploads/${file.filename}` : null;
//       return {
//         name: v.name,
//         price: parseFloat(v.price),
//         quantity: parseFloat(v.quantity),
//         image: imageUrl,
//         uid: v.uid,
//         barcode: v.barcode,
//         max_quantity_notification: v.max_quantity_notification,
//         description: v.description

//       };
//     });

//     const product = {
//       name: body.name,
//       // category_id: body.category_id,
//       description: body.description,
//       variants
//     };

//     return this.productsService.create(product, req['user'].id);
//   }




//   @Put(':id')
//   @UseInterceptors(AnyFilesInterceptor(multerOptions))
//   async updateProduct(
//     @Param('id') id: string,
//     @UploadedFiles() files: Array<Express.Multer.File>,
//     @Body() body: any,
//     @Req() req: Request
//   ) {
//     const baseUrl = `${req.protocol}://${req.get('host')}`;

//     let rawVariants = body.variants;
//     // let rawVariants = body.variants;

//     if (!rawVariants) {
//       throw new BadRequestException('variants yuborilmadi');
//     }

//     if (typeof rawVariants === 'string') {
//       try {
//         rawVariants = JSON.parse(rawVariants);
//       } catch (err) {
//         throw new BadRequestException('variants noto‘g‘ri formatda');
//       }
//     }

//     const variants = rawVariants.map((v, index) => {
//       const file = files.find(f => f.fieldname === `variants[${index}][image]`);
//       const imageUrl = file ? `${baseUrl}/uploads/${file.filename}` : v.image; // agar yangi rasm bo‘lmasa eski rasm
//       const price = parseFloat(v.price);
//       const quantity = parseFloat(v.quantity);

//       if (isNaN(price) || isNaN(quantity)) {
//         throw new BadRequestException(`Variant ${index + 1} uchun price yoki quantity noto‘g‘ri`);
//       }

//       return {
//         id: v.id, // agar mavjud variantlar update qilinayotgan bo‘lsa
//         name: v.name,
//         price: parseFloat(v.price),
//         quantity: parseFloat(v.quantity),
//         image: imageUrl,
//         uid: v.uid,
//         barcode: v.barcode,
//         max_quantity_notification: v.max_quantity_notification,
//         description: v.description
//       };
//     });

//     const product = {
//       name: body.name,
//       category_id: body.category_id,
//       description: body.description,
//       type: body.type,
//       code: body.code,
//       type1: body.type1,
//       variants
//     };

//     return this.productsService.update(+id, product);
//   }





//   @Get()
//   findAll(@Req() req: Request) {
//     console.log(req['user'].id, 'bu userId');


//     return this.productsService.findAll(req['user'].id);
//   }


//     @Get('search')
//   async searchVariant(
//     @Query('q') query: string,
//     @Req() req: any,
//   ) {
//     const userId = req.user.id;
//     // return 'hech qanday variant topilmadi';
    
//     return this.productsService.searchVariant(userId, query);
//   }

//   @Get(':id')
//   findOne(@Req() req: Request) {
//     const id = +req.params['id'];
//     return this.productsService.findOne(id);
//   }


//   @Delete(':id')
//   async remove(@Param('id') id: string) {
//     const fs = await import('fs');
//     return this.productsService.remove(+id, fs);
//   }




// }
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
  Query,
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

  // ✅ BIR NECHTA PRODUCTNI BIR VAQTDA YUKLASH
  @Post()
  @UseInterceptors(AnyFilesInterceptor(multerOptions))
  async createProducts(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body: any,
    @Req() req: Request
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    let rawProducts = body.products;

    if (!rawProducts) {
      throw new BadRequestException('products yuborilmadi');
    }

    if (typeof rawProducts === 'string') {
      try {
        rawProducts = JSON.parse(rawProducts);
      } catch (err) {
        throw new BadRequestException('products noto‘g‘ri formatda');
      }
    }

    const products = rawProducts.map((p, index) => {
      const file = files.find(f => f.fieldname === `products[${index}][image]`);
      const imageUrl = file ? `${baseUrl}/uploads/${file.filename}` : null;

      const price = parseFloat(p.price);
      const quantity = parseFloat(p.quantity);

      if (isNaN(price) || isNaN(quantity)) {
        throw new BadRequestException(
          `Mahsulot ${index + 1} uchun price yoki quantity noto‘g‘ri`
        );
      }

      return {
        name: p.name,
        price,
        quantity,
        image: imageUrl,
        uid: p.uid,
        barcode: p.barcode,
        max_quantity_notification: p.max_quantity_notification
        
      };
    });

    return this.productsService.create(products, req['user'].id);
  }

  // ✅ PRODUCT UPDATE
  @Put(':id')
  @UseInterceptors(AnyFilesInterceptor(multerOptions))
  async updateProduct(
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body: any,
    @Req() req: Request
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const file = files.find(f => f.fieldname === `image`);
    const imageUrl = file ? `${baseUrl}/uploads/${file.filename}` : body.image;

    const product = {
      name: body.name,
      price: parseFloat(body.price),
      quantity: parseFloat(body.quantity),
      image: imageUrl,
      uid: body.uid,
      barcode: body.barcode,
      max_quantity_notification: body.max_quantity_notification,
    
     
    };

    return this.productsService.update(+id, product);
  }

  // ✅ PRODUCTLARNI O‘QISH
  @Get()
  findAll(@Req() req: Request) {
    return this.productsService.findAll(req['user'].id);
  }

  // ✅ QIDIRUV
  @Get('search')
  async searchProduct(
    @Query('q') query: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.productsService.searchProduct(userId, query);
  }

  // ✅ BITTA PRODUCT
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  // ✅ O‘CHIRISH
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const fs = await import('fs');
    return this.productsService.remove(+id, fs);
  }
}
