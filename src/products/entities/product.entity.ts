

import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
// import { Category } from 'src/categories/entities/category.entity';
import { User } from 'src/meta-user/user.entity'; // foydalanuvchi entity'si
import { Unit } from 'src/units/entities/unit.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({unique: true})
  name: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ nullable: true })
  max_quantity_notification: number;


  @Column('float')
  price: number;

  @Column('float')
  quantity: number;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  uid: string




  // ✅ Foydalanuvchi bilan aloqa
  @ManyToOne(() => User, (user) => user.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;


  @ManyToOne(()=> Unit, (unit) => unit.products, {onDelete:"RESTRICT"})
  @JoinColumn({name: 'unit_id'})
  unit: Unit



  // // ✅ Kategoriya bilan aloqa
  // @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  // @JoinColumn({ name: 'category_id' })
  // category: Category;

  // @Column()
  // category_id: number;




}

