import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column()
    price: number

    @Column({ nullable: true })
    quantity: string

    @Column()
    unit: number

    @Column()
    isAvailable: boolean

    @Column()
    image: string

    @Column()
    count: number


}
