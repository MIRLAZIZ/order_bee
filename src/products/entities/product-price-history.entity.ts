// product-price-history.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from "typeorm";
import { Product } from "./product.entity";

@Entity()
export class ProductPriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 18, scale: 2 })
  purchase_price: number;

  @Column('decimal', { precision: 18, scale: 2 })
  selling_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;


  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Product, (product) => product.price_history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}

// ================================================================

