import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { Product } from "src/products/entities/product.entity";
@Entity()
export class Unit {
    @PrimaryGeneratedColumn()
    id: number
    @Column( {unique: true})
    name: string

    @Column()
    label: string

    
 // ✅ Bu joy muhim — Product bilan bog‘lanish
  @OneToMany(() => Product, (product) => product.unit)
  products: Product[];

    
}
