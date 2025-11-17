import { Exclude, Expose } from 'class-transformer';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany, ManyToOne, Unique } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Unit } from 'src/units/entities/unit.entity';
import { Sale } from 'src/sales/entities/sale.entity';
import { Role } from 'common/enums/role.enum';

@Entity()
@Exclude()
@Unique(['username'])
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
  @Column(
    {
      type: 'enum',
      enum: Role
    }
  )
  role: Role;



  @Expose()
  @CreateDateColumn()
  createdAt: Date;

  // @Expose()
  @Column()
  expiry_date: number;

 

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


  // Hodimni kim yaratgan (do'kon egasi)
@ManyToOne(() => User, (user) => user.employees)
createdBy: User;

// Do'kon egasiga tegishli hodimlar
@OneToMany(() => User, (user) => user.createdBy)
employees: User[];

}






