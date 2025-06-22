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


@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}
    async generateTime() {
    const now = dayjs();
    const expireAt = now.add(1, 'month');
    const exp = Math.floor(expireAt.toDate().getTime() / 1000);

 

    return exp
  }


async create(data: UserDto, createdBy: string): Promise<User> {
  // 1. Avval bazadan shu username mavjudligini tekshirish
  const existingUser = await this.userRepository.findOne({ where: { username: data.username } });
  if (existingUser) {
    throw new BadRequestException('Username already exists');
  }

  // 2. Agar mavjud bo'lmasa, passwordni hash qilamiz
  const hashPassword = await bcrypt.hash(data.password, 10);


  const exp = await this.generateTime();
  
  

  // 3. Yangi user yaratamiz va saqlaymiz
  const user = this.userRepository.create({ ...data, password: hashPassword, expiry_date: exp, createdBy });
  const savedUser = await this.userRepository.save(user);


  // 4. Natijani plain object qilib qaytaramiz
  return instanceToPlain(savedUser) as User;
}


async findAll(role: string): Promise<any[]> {
  const users = await this.userRepository.find({ where: { role } });
  const plainUsers = instanceToPlain(users);
  return plainUsers as any[];
}

async findByCreatedBy(createdBy: string): Promise<User[]> {
  const users = await this.userRepository.find({ where: { createdBy } });
  return users;
}


async findOne(id: number): Promise<User> {

  const user = await this.userRepository.findOne({ where: { id } });

  if (!user) {
    throw new NotFoundException('Foydalanuvchi topilmadi');
  }

  return instanceToPlain(user) as  User;
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
async  findOneByUsername(username: string): Promise<User> {
  const user = await this.userRepository.findOne({ where: { username } });
const allUsers = await this.userRepository.find();
  if (!user) {
    throw new NotFoundException('Parol yoki username xatottto');
  }
  return user;
}



  
}
