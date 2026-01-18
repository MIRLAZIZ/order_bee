import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { User } from 'src/meta-user/user.entity';
import { ProductPriceHistory } from 'src/products/entities/product-price-history.entity';
import { SaleStatus } from 'common/enums/sale-status.enum';

@Entity({ name: 'sales' })
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  // Har bir sotuvga tegishli mahsulot
  @ManyToOne(() => Product, (product) => product.sales, { eager: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => ProductPriceHistory, (pph) => pph.sales, {
    eager: false,
    onDelete: 'RESTRICT'
  })
  @JoinColumn({ name: 'product_price_history_id' })
  productPrice: ProductPriceHistory;

  // Sotuvchi (user)
  @ManyToOne(() => User, (user) => user.sales, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Sotilgan miqdor (necha dona mahsulot)
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: number) => Number(value),
    },
  })
  quantity: number;

  // Har bir dona mahsulot narxi
  @Column()
  selling_price: number;

  @Column()
  purchase_price: number;


  // Chegirma bo‘lsa
  @Column()
  discount: number;

  // Jami summa (price * quantity - discount)
  @Column()
  total: number;

  // To‘lov turi (naqd, karta, click, payme va hokazo)
  @Column({ type: 'varchar', length: 50 })
  paymentType: string;

  //   // Izoh (ixtiyoriy)
  //   @Column({ type: 'text', nullable: true })
  //   note: string;

  // Qachon sotilgan
  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.COMPLETED })
  status: SaleStatus;

  @Column({ type: 'text', nullable: true })
  cancelled_reason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  @Column({ nullable: true })
  cancelled_by: number;


  // O‘zgartirilgan sana
  @UpdateDateColumn()
  updatedAt: Date;


}
