// product-price-history.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, OneToMany } from "typeorm";
import { Product } from "./product.entity";
import { Sale } from "src/sales/entities/sale.entity";

@Entity()
export class ProductPriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 18, scale: 2, transformer: { to: (value: number) => value, from: (value: number) => Number(value) } })
  purchase_price: number;

  @Column('decimal', { precision: 18, scale: 2, transformer: { to: (value: number) => value, from: (value: number) => Number(value) } })
  selling_price: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 3,
    transformer: {
      to: (value: number) => value,
      from: (value: number) => Number(value),
    }
  })
  quantity: number;


  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Product, (product) => product.price_history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => Sale, (sale) => sale.productPrice)
  sales: Sale[];

}

// ================================================================

