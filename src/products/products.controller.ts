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
import { User } from 'src/meta-user/user.entity';
import { CurrentUser } from 'common/decorators/current-user.decarotor';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  /**
   * ✅ Yangi mahsulot yaratish (faqat bitta)
   * Body: { name, barcode?, quick_code?, purchase_price, selling_price, quantity, unit_id, ... }
   */
  @Post()
  @Roles(Role.Client)
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User
  ) {
    return this.productsService.create(createProductDto, user.id);
  }

  @Post('history')
  async createPriceHistory(@Req() req: Request, @Body() newPriceHistory: PriceHistoryDto) {
    return this.productsService.createPriceHistory(newPriceHistory, req['user'].id);
  }

  @Get('search')
  async searchByCode(@Query('code') code: string, @CurrentUser() user:User ){
    return this.productsService.search(user.id, code);
  }

  @Get('/lowstock')
  async getLowStock(@CurrentUser() user: User) {
    return this.productsService.getLowStock(user.id);
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
    @CurrentUser() user: User
  ) {
    return this.productsService.update(id, user.id, updateProductDto);
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
  @CurrentUser() user: User
  ) {
    return this.productsService.updatePriceHistory(id, user.id, updatePriceDto);
  }

  /**
   * ✅ Barcha mahsulotlarni olish (narx bilan)
   */
  @Get(':page')
  findAll(@CurrentUser() user: User, @Param('page', ParseIntPipe) page: number) {
    return this.productsService.findAll(user.id, page);
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
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.productsService.findOne(id, user.id);
  }

  /**
   * ✅ Mahsulot narx tarixini olish
   */
  @Get(':id/price-history')
  getPriceHistoryOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.productsService.getPriceHistoryOne(id, user.id);
  }



  /**
   * ✅ Mahsulotni o'chirish
   * Sale'da ishtirok etgan bo'lsa o'chirilmaydi
   */
  @Delete(':id')
  @Roles(Role.Client)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.productsService.delete(id, user.id);
  }
  @Delete(':id/ ')
  @Roles(Role.Client)
  async removePriceHistory(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.productsService.deletePriceHistory(id, user.id);
  }





}