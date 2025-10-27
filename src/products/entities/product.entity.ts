
// }

import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Variant } from './variant.entity';
import { Category } from 'src/categories/entities/category.entity';
import { User } from 'src/meta-user/user.entity'; // foydalanuvchi entity'si

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // ✅ Foydalanuvchi bilan aloqa
  @ManyToOne(() => User, (user) => user.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;



  // ✅ Kategoriya bilan aloqa
  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column()
  category_id: number;

  // ✅ Variantlar bilan aloqa
  @OneToMany(() => Variant, (variant) => variant.product, {
    cascade: true,
  })
  variants: Variant[];
}

