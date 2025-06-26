// src/products/entities/variant.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Product } from './product.entity';

@Entity()
export class Variant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column('float')
    price: number;

    @Column('float')
    quantity: number;

    @Column({ nullable: true })
    image: string;

    @ManyToOne(() => Product, product => product.variants, {
        onDelete: 'CASCADE',
    })
    product: Product;
}

