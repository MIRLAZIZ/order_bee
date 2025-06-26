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
import { Variant } from './entities/variant.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Variant])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}