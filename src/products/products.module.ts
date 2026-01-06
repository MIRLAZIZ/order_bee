import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductPriceHistory } from './entities/product-price-history.entity';
import { Sale } from 'src/sales/entities/sale.entity';
import { Unit } from 'src/units/entities/unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductPriceHistory, Unit, Sale])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService]
})
export class ProductsModule {

}

// Qilinadigan ishlar 
// 1 products search barcode, name, unicId. ✅
// 2 products karzinka.🚫
// 3 products sotildi sales  module.
// 4 qaytarilishi mumkin  bolgan xolat unda bitta api chiqarish kerak qaytarilgan maxsulotni joyiga qoyish uchun  unda tolanadigan pul ham kamayishi kerak
// 5 statistika eng kop sotilgan, kop foyda qilingan, 