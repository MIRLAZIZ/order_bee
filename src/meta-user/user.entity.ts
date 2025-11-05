import { Exclude, Expose } from 'class-transformer';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Unit } from 'src/units/entities/unit.entity';
import { Sale } from 'src/sales/entities/sale.entity';

@Entity()
@Exclude()
export class User {
  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @Column({ nullable: false })
  fullName: string;

  @Expose()
  @Column({ nullable: false, unique: true })
  username: string;

  @Column({ nullable: false })
  password: string;

  @Expose()
  @Column({ nullable: true })
  brandName: string;

  @Expose()
  @Column({ nullable: false })
  role: string;



  @Expose()
  @CreateDateColumn()
  createdAt: Date;

  // @Expose()
  @Column()
  expiry_date: number;

  @Column()
  createdBy: string;

  @Column()
  phone: string

  // ✅ Product bilan OneToMany bog‘lanish
  @OneToMany(() => Product, (product) => product.user)
  products: Product[];

  @OneToMany(() => Category, (category) => category.user)
  categories: Category[]

  @OneToMany(()=> Unit, (unit) => unit.user)
  units: Unit[]

  @OneToMany(()=> Sale, (sale) => sale.user)
  sales: Sale[]

}




