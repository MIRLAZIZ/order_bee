// import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

// @Entity('product')
// export class Product {
//     @PrimaryGeneratedColumn()
//     id: number

//     @Column()
//     name: string

//     @Column()
//     price: number

//     @Column()
//     quantity: string

//     @Column()
//     unit: string

//     @Column()
//     isAvailable: boolean

//     @Column()
//     image: string

//     @Column({ nullable: true })
//     count: number


// }


// ==== 1. ENTITY FILES ====

// src/products/entities/product.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Variant } from './variant.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  category_id: string;



  @OneToMany(() => Variant, variant => variant.product, {
    cascade: true,
    eager: true,
  })
  variants: Variant[];
}
