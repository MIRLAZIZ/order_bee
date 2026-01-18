// product.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Unique,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { User } from 'src/meta-user/user.entity';
import { Unit } from 'src/units/entities/unit.entity';
import { Sale } from 'src/sales/entities/sale.entity';
import { ProductPriceHistory } from './product-price-history.entity';
import { PriceMode } from 'common/enums/priceMode.enum';

@Entity()
@Unique(['name', 'user'])
@Unique(['barcode', 'user'])
@Unique(['quick_code', 'user'])

export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // ✅ Barcode - scanner uchun (ixtiyoriy)
  @Column({ nullable: true })
  barcode: string;

  // ✅ Quick code - tez sotish uchun (1, 2, 3, 99, A1, B2 va h.k.)
  // Barcode bo'lmagan mahsulotlar uchun qo'lda kiritiladi
  @Column({ nullable: true, length: 20 })
  quick_code: string;

  // ✅ Stock ogohlantirish chegarasi
  @Column({ nullable: true })
  max_quantity_notification: number;



  @OneToMany(() => ProductPriceHistory, (history) => history.product, {
    cascade: true
  })
  price_history: ProductPriceHistory[];





  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to:(value: number) => value,
      from:(value: number) => Number(value),
   

    }
  })
  quantity: number;

  // // ✅ Qo'shimcha ma'lumot
  // @Column({ nullable: true, length: 500 })
  // description: string;

  // ✅ Mahsulot aktiv/noaktiv
  // @Column({ default: true })
  // is_active: boolean;

  // ✅ Foydalanuvchi bilan aloqa
  @ManyToOne(() => User, (user) => user.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // ✅ Birlik bilan aloqa
  @ManyToOne(() => Unit, (unit) => unit.products, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  // ✅ Savdolar bilan aloqa
  @OneToMany(() => Sale, (sale) => sale.product)
  sales: Sale[];

  // ✅ Quick code yoki Barcode orqali qidirish uchun helper
  @BeforeInsert()
  @BeforeUpdate()
  normalizeQuickCode() {
    // Quick code ni uppercase qilish (A1, B2 kabi)
    if (this.quick_code) {
      this.quick_code = this.quick_code.trim().toUpperCase();
    }
  }

  @Column({ type: 'enum', enum: PriceMode, default: PriceMode.Old })
  price_mode: PriceMode



}









// // ✅ Kategoriya bilan aloqa
// @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
// @JoinColumn({ name: 'category_id' })
// category: Category;

// @Column()
// category_id: number;

