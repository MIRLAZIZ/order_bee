
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Variant } from './variant.entity';
import { Category } from 'src/categories/entities/category.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;


  
  @ManyToOne(() => Category, {onDelete: 'RESTRICT'})
  @JoinColumn({ name: 'category_id' })
  category: Category

  @Column()
  category_id: number;



  @OneToMany(() => Variant, variant => variant.product, {
    cascade: true,
    eager: true,
  })
  variants: Variant[];
}
