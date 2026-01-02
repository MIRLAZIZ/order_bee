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

  @Get('search')
  async searchByCode(@Query('code') code: string, @Req() req: Request) {
    return this.productsService.search(req['user'].id, code);
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
  @Put(':id/price')
  @Roles(Role.Client)
  async updatePrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePriceDto: PriceHistoryDto,
    @Req() req: Request,
  ) {
    return this.productsService.updatePriceHistory(id, req['user'].id, updatePriceDto);
  }

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
    return this.productsService.getPriceHistoryOne(id, req['user'].id);
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
  @Delete(':id/price-history')
  @Roles(Role.Client)
  async removePriceHistory(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.productsService.deletePriceHistory(id, req['user'].id);
  }
}