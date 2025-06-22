import { Exclude, Expose } from 'class-transformer';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

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

}




