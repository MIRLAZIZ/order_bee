import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductsModule } from 'src/products/products.module';
import { StatisticsModule } from 'src/statistics/statistics.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Product, ]), ProductsModule, StatisticsModule ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
