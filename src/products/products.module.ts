import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductBatch } from './entities/product-batch.entity';
import { Sale } from 'src/sales/entities/sale.entity';
import { Unit } from 'src/units/entities/unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductBatch, Unit, Sale])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService]
})
export class ProductsModule {

}

