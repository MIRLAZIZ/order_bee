import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import UserDto from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { NotFoundException } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import ChangePasswordDto from './dto/password.dto';
import { ConflictException } from '@nestjs/common';
import * as dayjs from 'dayjs';
import { Role } from 'common/enums/role.enum';


@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) { }
  async generateTime() {
    const now = dayjs();
    const expireAt = now.add(1, 'month');
    const exp = Math.floor(expireAt.toDate().getTime() / 1000);



    return exp
  }



  async create(
    data: UserDto,
    createdById: number,
    currentUserRole: Role
  ): Promise<User> {

    // 1️⃣ Password hash va expiry_date parallel ravishda generatsiya qilinadi
    const [hashPassword, exp] = await Promise.all([
      bcrypt.hash(data.password, 10),
      this.generateTime()
    ]);
    
    const targetRole = data.role; // yaratmoqchi bo‘lgan userning role
    console.log(targetRole);

    // 2️⃣ Role ga qarab huquqni tekshirish
    if (currentUserRole === Role.Admin) {
      if (targetRole === Role.Cashier) {
        throw new BadRequestException("Admin Cashier yaratolmaydi");
      }
    } else if (currentUserRole === Role.Agent) {
      if (targetRole !== Role.Client) {
        throw new BadRequestException("Agent faqat Client yaratishi mumkin");
      }
    } else if (currentUserRole === Role.Client) {
      if (targetRole !== Role.Cashier) {

        throw new BadRequestException("Client faqat Cashier yaratishi mumkin");
      }
    } else {

      // Agar role noma’lum bo‘lsa
      throw new BadRequestException("Sizda user yaratish huquqi yo‘q");
    }

    // 3️⃣ User entity yaratish
    const user = this.userRepository.create({
      ...data,
      password: hashPassword,
      expiry_date: exp,
      createdBy: createdById ? ({ id: createdById } as User) : undefined
    });

    // 4️⃣ Bazaga saqlash
    const savedUser = await this.userRepository.save(user);

    // 5️⃣ Plain object ga aylantirish va qaytarish
    return instanceToPlain(savedUser) as User;
  }



  async findAll(userId: number, role: Role): Promise<any[]> {
    // 1️⃣ Admin bo‘lsa → faqat clientlarni olish


    if (role === Role.Admin) {

      const users = await this.userRepository.find({ where: { role: Role.Client } });
      return instanceToPlain(users) as any[];
    }

    // 2️⃣ Agent yoki Client bo‘lsa → o‘z yaratgan clientlarni olish
    if (role === Role.Client) {
      const users = await this.userRepository.find({
        where: {
          role: Role.Cashier,
          createdBy: { id: userId } // o‘z yaratgan clientlar
        },
        relations: ['createdBy'] // Foreign key relationni join qilish
      });
      return instanceToPlain(users) as any[];
    }

    if (role === Role.Agent) {

      const users = await this.userRepository.find({
        where: {
          role: Role.Client,
          createdBy: { id: userId } // o‘z yaratgan clientlar
        },
        relations: ['createdBy'] // Foreign key relationni join qilish
      });
      return instanceToPlain(users) as any[];
    }

    // 3️⃣ Agar boshqa role bo‘lsa → bo‘sh array qaytarish
    throw new BadRequestException('Invalid role');
  }



  async findOne(id: number): Promise<User> {

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    return instanceToPlain(user) as User;
  }

  async delete(id: number): Promise<void> {
    const result = await this.userRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Foydalanuvchi ${id} topilmadi`);
    }
  }

  async update(id: number, data: Partial<UserDto>): Promise<User> {
    const user = await this.findOne(id);


    const { password, username, ...otherData } = data;

    // Username tekshirish (agar o'zgartirilayotgan bo'lsa)
    if (username && username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username }
      });

      if (existingUser) {
        throw new ConflictException(`Username '${username}' already exists`);
      }
      user.username = username;
    }

    // Password ni hash qilish (agar berilgan bo'lsa)
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Boshqa ma'lumotlarni yangilash
    Object.assign(user, otherData);

    return this.userRepository.save(user);
  }

  async changePassword(id: number, changePasswordDto: ChangePasswordDto): Promise<User> {
    const user = await this.findOne(id);
    const hashedPassword = await bcrypt.hash(changePasswordDto.password, 10);
    user.password = hashedPassword;
    return this.userRepository.save(user);
  }
  async findOneByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } });
    const allUsers = await this.userRepository.find();
    if (!user) {
      throw new NotFoundException('Parol yoki username xatottto');
    }
    return user;
  }




}
