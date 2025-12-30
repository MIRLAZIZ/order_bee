
// // import {
// //   Controller,
// //   Post,
// //   Body,
// //   UploadedFiles,
// //   UseInterceptors,
// //   BadRequestException,
// //   Req,
// //   Get,
// //   Put,
// //   Param,
// //   Delete,
// //   Query,
// // } from '@nestjs/common';
// // import { AnyFilesInterceptor } from '@nestjs/platform-express';
// // import * as fs from 'fs';
// // import { Request } from 'express';
// // import { multerOptions } from 'common/utils/multer-options';
// // import { ProductsService } from './products.service';

// // @Controller('products')
// // export class ProductsController {
// //   constructor(private readonly productsService: ProductsService) {
// //     const uploadDir = './uploads';
// //     if (!fs.existsSync(uploadDir)) {
// //       fs.mkdirSync(uploadDir, { recursive: true });
// //     }
// //   }

// //   // ✅ BIR NECHTA PRODUCTNI BIR VAQTDA YUKLASH
// //   @Post()
// //   @UseInterceptors(AnyFilesInterceptor(multerOptions))
// //   async createProducts(
// //     @UploadedFiles() files: Array<Express.Multer.File>,
// //     @Body() body: any,
// //     @Req() req: Request
// //   ) {
// //     const baseUrl = `${req.protocol}://${req.get('host')}`;

// //     let rawProducts = body.products;

// //     if (!rawProducts) {
// //       throw new BadRequestException('products yuborilmadi');
// //     }

// //     if (typeof rawProducts === 'string') {
// //       try {
// //         rawProducts = JSON.parse(rawProducts);
// //       } catch (err) {
// //         throw new BadRequestException('products noto‘g‘ri formatda');
// //       }
// //     }

// //     const products = rawProducts.map((p, index) => {
// //       const file = files.find(f => f.fieldname === `products[${index}][image]`);
// //       const imageUrl = file ? `${baseUrl}/uploads/${file.filename}` : null;

// //       const price = parseFloat(p.price);
// //       const quantity = parseFloat(p.quantity);

// //       if (isNaN(price) || isNaN(quantity)) {
// //         throw new BadRequestException(
// //           `Mahsulot ${index + 1} uchun price yoki quantity noto‘g‘ri`
// //         );
// //       }
      

// //       return {
// //         name: p.name,
// //         price,
// //         quantity,
// //         image: imageUrl,
// //         uid: p.uid,
// //         barcode: p.barcode,
// //         max_quantity_notification: p.max_quantity_notification,
// //         unit_id: p.unit_id
        
// //       };
// //     });
    

// //     return this.productsService.create(products, req['user'].id);
// //   }

// //   // ✅ PRODUCT UPDATE
// //   @Put(':id')
// //   @UseInterceptors(AnyFilesInterceptor(multerOptions))
// //   async updateProduct(
// //     @Param('id') id: string,
// //     @UploadedFiles() files: Array<Express.Multer.File>,
// //     @Body() body: any,
// //     @Req() req: Request
// //   ) {
// //     const baseUrl = `${req.protocol}://${req.get('host')}`;

// //     const file = files.find(f => f.fieldname === `image`);
// //     const imageUrl = file ? `${baseUrl}/uploads/${file.filename}` : body.image;

// //     const product = {
// //       name: body.name,
// //       price: parseFloat(body.price),
// //       quantity: parseFloat(body.quantity),
// //       image: imageUrl,
// //       uid: body.uid,
// //       barcode: body.barcode,
// //       max_quantity_notification: body.max_quantity_notification,
// //       unit_id: body.unit_id
    
     
// //     };

// //     return this.productsService.update(+id, product);
// //   }

// //   // ✅ PRODUCTLARNI O‘QISH
// //   @Get()
// //   findAll(@Req() req: Request) {
// //     return this.productsService.findAll(req['user'].id);
// //   }

// //   // ✅ QIDIRUV
// //   @Get('search')
// //   async searchProduct(
// //     @Query('q') query: string,
// //     @Req() req: any,
// //   ) {
// //     const userId = req.user.id;
// //     return this.productsService.searchProduct(userId, query);
// //   }

// //   // ✅ BITTA PRODUCT
// //   @Get(':id')
// //   findOne(@Param('id') id: string) {
// //     return this.productsService.findOne(+id);
// //   }

// //   // ✅ O‘CHIRISH
// //   @Delete(':id')
// //   async remove(@Param('id') id: string) {
// //     const fs = await import('fs');
// //     return this.productsService.remove(+id, fs);
// //   }
// // }




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
//   InternalServerErrorException,
// } from '@nestjs/common';
// import { AnyFilesInterceptor } from '@nestjs/platform-express';
// import * as fs from 'fs';
// import { Request } from 'express';
// import { multerOptions } from 'common/utils/multer-options';
// import { ProductsService } from './products.service';
// import { Roles } from 'common/decorators/roles.decorator';
// import { Role } from 'common/enums/role.enum';

// @Controller('products')
// export class ProductsController {
//   constructor(private readonly productsService: ProductsService) {
//     const uploadDir = './uploads';
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }
//   }

//   // ✅ BIR NECHTA PRODUCTNI YUKLASH
//   @Post()
//   @UseInterceptors(AnyFilesInterceptor(multerOptions))
//   @Roles(Role.Client)
//   async createProducts(
//     @UploadedFiles() files: Array<Express.Multer.File>,
//     @Body() body: any,
//     @Req() req: Request,
//   ) {
//     try {
//       const baseUrl = `${req.protocol}://${req.get('host')}`;
//       let rawProducts = body.products;

//       if (!rawProducts) {
//         // 🔴 Xatolik foydalanuvchi tomondan
//         throw new BadRequestException('products yuborilmadi');
//       }

//       // 🔹 products JSON string ko‘rinishida bo‘lsa, uni parse qilamiz
//       if (typeof rawProducts === 'string') {
//         try {
//           rawProducts = JSON.parse(rawProducts);
//         } catch {
//           throw new BadRequestException('products noto‘g‘ri formatda');
//         }
//       }

//       // 🔹 Har bir mahsulotni tayyorlaymiz
//       const products = rawProducts.map((p, index) => {
//         const file = files.find(
//           (f) => f.fieldname === `products[${index}][image]`,
//         );
//         const imageUrl = file ? `${baseUrl}/uploads/${file.filename}` : null;

//         const price = parseFloat(p.price);
//         const quantity = parseFloat(p.quantity);

//         if (isNaN(price) || isNaN(quantity)) {
//           throw new BadRequestException(
//             `Mahsulot ${index + 1} uchun price yoki quantity noto‘g‘ri`,
//           );
//         }

//         return {
//           name: p.name,
//           price,
//           quantity,
//           image: imageUrl,
//           uid: p.uid,
//           barcode: p.barcode,
//           max_quantity_notification: p.max_quantity_notification,
//           unit_id: p.unit_id,
//         };
//       });

//       // 🔹 Servisga yuboramiz
//       return await this.productsService.create(products, req['user'].id);
//     } catch (error) {
//       // 🔴 Xato bo‘lsa — bu global filterga tushadi
//       throw new InternalServerErrorException(error.message);
//     }
//   }

//   // ✅ PRODUCT UPDATE
//   @Put(':id')
//   @UseInterceptors(AnyFilesInterceptor(multerOptions))
//   async updateProduct(
//     @Param('id') id: string,
//     @UploadedFiles() files: Array<Express.Multer.File>,
//     @Body() body: any,
//     @Req() req: Request,
//   ) {
//     try {
//       const baseUrl = `${req.protocol}://${req.get('host')}`;

//       const file = files.find((f) => f.fieldname === `image`);
//       const imageUrl = file
//         ? `${baseUrl}/uploads/${file.filename}`
//         : body.image;

//       const product = {
//         name: body.name,
//         price: parseFloat(body.price),
//         quantity: parseFloat(body.quantity),
//         image: imageUrl,
//         uid: body.uid,
//         barcode: body.barcode,
//         max_quantity_notification: body.max_quantity_notification,
//         unit_id: body.unit_id,
//       };

//       return await this.productsService.update(+id, product);
//     } catch (error) {
//       throw new InternalServerErrorException(error.message);
//     }
//   }

//   // ✅ PRODUCTLARNI O‘QISH
//   @Get()
//   findAll(@Req() req: Request) {
//     console.log(req['user'].id);
    
//     return this.productsService.findAll(req['user'].id);
//   }

//   // ✅ QIDIRUV
//   @Get('search')
//   async searchProduct(@Query('q') query: string, @Req() req: any) {
//     const userId = req.user.id;
//     return this.productsService.searchProduct(userId, query);
//   }

//   // ✅ BITTA PRODUCT
//   @Get(':id')
//   findOne(@Param('id') id: string, @Req() req: any) {
//     return this.productsService.findOne(+id, req['user'].id);
//   }

//   // ✅ O‘CHIRISH
//   @Delete(':id')
//   async remove(@Param('id') id: string, @Req() req: any) {
//     const fs = await import('fs');
//     return this.productsService.remove(+id, fs, req['user'].id);
//   }
// }



import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ProductsService } from './products.service';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/enums/role.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { PriceHistoryDto } from './dto/price-history.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * ✅ Yangi mahsulot yaratish (faqat bitta)
   * Body: { name, barcode?, quick_code?, purchase_price, selling_price, quantity, unit_id, ... }
   */
  @Post()
  @Roles(Role.Client)
  async create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: Request,
  ) {
    return this.productsService.create(createProductDto, req['user'].id);
  }

@Post('history')
async  createPriceHistory(@Req() req: Request, @Body() newPriceHistory: PriceHistoryDto) {
  return this.productsService.createPriceHistory(newPriceHistory, req['user'].id);
}           


  

  /**
   * ✅ Mahsulotni yangilash (narxdan tashqari)
   * Body: { name?, barcode?, quick_code?, quantity?, unit_id?, ... }
   */
  @Put(':id')
  @Roles(Role.Client)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: Request,
  ) {
    return this.productsService.update(id, req['user'].id, updateProductDto);
  }

  /**
   * ✅ Mahsulot narxini yangilash
   * Body: { purchase_price?, selling_price? }
  //  */
  // @Put(':id/price')
  // @Roles(Role.Client)
  // async updatePrice(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() updatePriceDto: UpdatePriceDto,
  //   @Req() req: Request,
  // ) {
  //   return this.productsService.updatePrice(id, req['user'].id, updatePriceDto);
  // }

  /**
   * ✅ Barcha mahsulotlarni olish (narx bilan)
   */
  @Get()
  findAll(@Req() req: Request) {
    return this.productsService.findAll(req['user'].id);
  }

  /**
   * ✅ Quick code yoki barcode orqali qidirish (KASSA UCHUN)
   * GET /products/search?code=A1
   * GET /products/search?code=4780000135063
   */
  @Get('search')
  async searchByCode(@Query('code') code: string, @Req() req: Request) {
    return this.productsService.findByCodeOrBarcode(code, req['user'].id);
  }

  /**
   * ✅ Bitta mahsulotni olish (narx tarixi bilan)
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.productsService.findOne(id, req['user'].id);
  }

  /**
   * ✅ Mahsulot narx tarixini olish
   */
  @Get(':id/price-history')
  getPriceHistory(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.productsService.getPriceHistory(id, req['user'].id);
  }

  /**
   * ✅ Mahsulotni o'chirish
   * Sale'da ishtirok etgan bo'lsa o'chirilmaydi
   */
  @Delete(':id')
  @Roles(Role.Client)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.productsService.delete(id, req['user'].id);
  }
}