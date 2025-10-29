// import { Module } from '@nestjs/common';
// import { ProductsService } from './products.service';
// import { ProductsController } from './products.controller';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { Product } from './entities/product.entity';

// @Module({
//   imports: [TypeOrmModule.forFeature([Product])],
//   controllers: [ProductsController],
//   providers: [ProductsService],
// })
// export class ProductsModule {}


// ==== 5. MODULE FILE ====

// src/products/products.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}

// Qilinadigan ishlar 
// 1 products search barcode, name, unicId. ✅
// 2 products karzinka.
// 3 products sotildi.
// 4 qaytarilishi mumkin  bolgan xolat unda bitta api chiqarish kerak qaytarilgan maxsulotni joyiga qoyish uchun  unda tolanadigan pul ham kamayishi kerak
// 5 statistika eng kop sotilgan, kop foyda qilingan, 