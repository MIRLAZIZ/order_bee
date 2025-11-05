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

@Entity({ name: 'sales' })
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  // Har bir sotuvga tegishli mahsulot
  @ManyToOne(() => Product, (product) => product.sales, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Sotuvchi (user)
  @ManyToOne(() => User, (user) => user.sales, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Sotilgan miqdor (necha dona mahsulot)
  @Column({ type: 'int' })
  quantity: number;

  // Har bir dona mahsulot narxi
  @Column()
  price: number;

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

  // O‘zgartirilgan sana
  @UpdateDateColumn()
  updatedAt: Date;
}
