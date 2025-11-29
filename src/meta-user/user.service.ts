// import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { User } from './user.entity';
// import UserDto from './dto/user.dto';
// import * as bcrypt from 'bcrypt';
// import { NotFoundException } from '@nestjs/common';
// import { instanceToPlain } from 'class-transformer';
// import ChangePasswordDto from './dto/password.dto';
// import { ConflictException } from '@nestjs/common';
// import * as dayjs from 'dayjs';
// import { Role } from 'common/enums/role.enum';


// @Injectable()
// export class UserService {
//   constructor(
//     @InjectRepository(User)
//     private userRepository: Repository<User>
//   ) { }
//   async generateTime() {
//     const now = dayjs();
//     const expireAt = now.add(1, 'month');
//     const exp = Math.floor(expireAt.toDate().getTime() / 1000);



//     return exp
//   }



//   async create(
//     data: UserDto,
//     createdById: number,
//     currentUserRole: Role
//   ): Promise<User> {

//     // 1️⃣ Password hash va expiry_date parallel ravishda generatsiya qilinadi
//     const [hashPassword, exp] = await Promise.all([
//       bcrypt.hash(data.password, 10),
//       this.generateTime()
//     ]);

//     const targetRole = data.role; // yaratmoqchi bo‘lgan userning role

//     // 2️⃣ Role ga qarab huquqni tekshirish
//     if (currentUserRole === Role.Admin) {
//       if (targetRole === Role.Cashier) {
//         throw new ForbiddenException("Admin Cashier yaratolmaydi");
//       }
//     } else if (currentUserRole === Role.Agent) {
//       if (targetRole !== Role.Client) {
//         throw new ForbiddenException("Agent faqat Client yaratishi mumkin");
//       }
//     } else if (currentUserRole === Role.Client) {
//       if (targetRole !== Role.Cashier) {

//         throw new ForbiddenException("Client faqat Cashier yaratishi mumkin");
//       }
//     } else {

//       // Agar role noma’lum bo‘lsa
//       throw new ForbiddenException("Sizda user yaratish huquqi yo‘q");
//     }

//     // 3️⃣ User entity yaratish
//     const user = this.userRepository.create({
//       ...data,
//       password: hashPassword,
//       expiry_date: exp,
//       createdBy: createdById ? ({ id: createdById } as User) : undefined
//     });

//     // 4️⃣ Bazaga saqlash
//     const savedUser = await this.userRepository.save(user);

//     // 5️⃣ Plain object ga aylantirish va qaytarish
//     return instanceToPlain(savedUser) as User;
//   }



//   async findAll(userId: number, role: Role): Promise<any[]> {
//     // 1️⃣ Admin bo‘lsa → faqat clientlarni olish


//     if (role === Role.Admin) {

//       const users = await this.userRepository.find({ where: { role: Role.Client } });
//       return instanceToPlain(users) as any[];
//     }

//     // 2️⃣ Agent yoki Client bo‘lsa → o‘z yaratgan clientlarni olish
//     if (role === Role.Client) {
//       const users = await this.userRepository.find({
//         where: {
//           role: Role.Cashier,
//           createdBy: { id: userId } // o‘z yaratgan clientlar
//         },
//         relations: ['createdBy'] // Foreign key relationni join qilish
//       });
//       return instanceToPlain(users) as any[];
//     }

//     if (role === Role.Agent) {

//       const users = await this.userRepository.find({
//         where: {
//           role: Role.Client,
//           createdBy: { id: userId } // o‘z yaratgan clientlar
//         },
//         relations: ['createdBy'] // Foreign key relationni join qilish
//       });
//       return instanceToPlain(users) as any[];
//     }

//     // 3️⃣ Agar boshqa role bo‘lsa → bo‘sh array qaytarish
//     throw new BadRequestException('Invalid role');
//   }



//   async findOne(id: number, currentUser: User): Promise<User> {
//     // currentUser → req.user (JWT orqali)
//     const user = await this.userRepository.findOne({
//       where: { id },
//       relations: ['createdBy'], // createdBy.id olish uchun
//     });

//     if (!user) {
//       throw new NotFoundException('Foydalanuvchi topilmadi');
//     }

//     // 🔹 Agar o‘zi bo‘lsa — har kim ko‘ra oladi
//     if (user.id === currentUser.id) {
//       return instanceToPlain(user) as User;
//     }

//     // 🔹 Admin har qanday userni ko‘ra oladi
//     if (currentUser.role === Role.Admin) {
//       return instanceToPlain(user) as User;
//     }

//     // 🔹 Agent yoki Client — faqat o‘z yaratganlarini ko‘ra oladi
//     if (
//       currentUser.role === Role.Agent ||
//       currentUser.role === Role.Client
//     ) {
//       if (user.createdBy?.id === currentUser.id) {
//         return instanceToPlain(user) as User;
//       } else {
//         throw new ForbiddenException('Siz bu foydalanuvchini ko‘rish huquqiga ega emassiz');
//       }
//     }

//     // 🔹 Boshqa role — hech narsani ko‘rmasin
//     throw new ForbiddenException('Siz bu foydalanuvchini ko‘rish huquqiga ega emassiz');
//   }




//   // ❌ Foydalanuvchini o‘chirish
//   async delete(id: number, currentUser: User): Promise<void> {
//     // 1. O‘chiriladigan userni olish
//     const user = await this.userRepository.findOne({
//       where: { id },
//       relations: ['createdBy'],
//     });

//     if (!user) {
//       throw new NotFoundException('Foydalanuvchi topilmadi');
//     }

//     // 2. Role bo‘yicha ruxsatlar
//     const isAdmin = currentUser.role === Role.Admin;
//     const isClient = currentUser.role === Role.Client;
//     const isAgentOrCashier =
//       currentUser.role === Role.Agent ||
//       currentUser.role === Role.Cashier

//     // ❌ Agent yoki Cashier → umuman hech kimni o‘chira olmaydi
//     if (isAgentOrCashier) {
//       throw new ForbiddenException("Sizda foydalanuvchi o‘chirish huquqi yo‘q");
//     }

//     // ✔ Admin → barchani o‘chirishi mumkin
//     if (isAdmin) {
//       await this.userRepository.delete(id);
//       return;
//     }

//     // ✔ Client → faqat o‘zi yaratgan userlarni o‘chiradi
//     if (isClient) {
//       const isCreator = user.createdBy?.id === currentUser.id;

//       if (!isCreator) {
//         throw new ForbiddenException(
//           "Siz faqat o‘zingiz yaratgan foydalanuvchilarni o‘chira olasiz"
//         );
//       }




//       await this.userRepository.delete(id);
//       return;
//     }

//     throw new ForbiddenException("Sizda foydalanuvchi o‘chirish huquqi yo‘q");
//   }




//   //update users
//   async update(
//     id: number,
//     data: Partial<UserDto>,
//     currentUser: User
//   ): Promise<{ message: string }> {

//     // 1. Update qilinadigan userni olish
//     const user = await this.userRepository.findOne({
//       where: { id },
//       relations: ['createdBy']
//     });

//     if (!user) {
//       throw new NotFoundException('Foydalanuvchi topilmadi');
//     }

//     // ============================
//     // 2. Ruxsatlar
//     // ============================

//     const isAdmin = currentUser.role === Role.Admin;
//     const isClient = currentUser.role === Role.Client;

//     const isOwnAccount = currentUser.id === id;
//     const isCreator = user.createdBy?.id === currentUser.id; // Client → Cashier yaratgan


//     // === ADMIN ===
//     if (isAdmin) {
//       // Admin hammani update qila oladi
//     }
//     // === CLIENT ===
//     else if (isClient) {
//       // ❌ Client role o‘zgartira olmaydi
//       if (data.role && data.role !== user.role) {
//         throw new ForbiddenException(
//           "Client foydalanuvchi rolini o‘zgartira olmaydi"
//         );
//       }
//       if (!(isOwnAccount || isCreator)) {
//         throw new ForbiddenException(
//           "Client faqat o‘zini yoki o‘zi yaratgan xodimlarni yangilay oladi"
//         );
//       }

//     }
//     // === BOSHQA ROLELAR ===
//     else {
//       if (!isOwnAccount) {
//         throw new ForbiddenException(
//           "Siz faqat o‘z profilingizni yangilay olasiz"
//         );
//       }
//     }

//     // ============================
//     // 3. Username tekshirish
//     // ============================

//     if (data.username && data.username !== user.username) {
//       const existingUser = await this.userRepository.findOne({
//         where: { username: data.username }
//       });

//       if (existingUser) {
//         throw new ConflictException(
//           `Username '${data.username}' allaqachon mavjud`
//         );
//       }

//       user.username = data.username;
//     }

//     // ============================
//     // 4. Passwordni update taqiqlash
//     // ============================

//     if (data.password) {
//       throw new BadRequestException(
//         "Parolni o‘zgartirish huquqi yo‘q"
//       );
//     }

//     // ============================
//     // 5. Qolgan fieldlarni yangilash
//     // ============================

//     const { username, password, ...otherData } = data;
//     Object.assign(user, otherData);

//     await this.userRepository.save(user) as User;
//     return { message: "Foydalanuvchi muvaffaqiyatli yangilandi" };
//   }


//   //changePassword
//   async changePassword(
//     id: number,
//     dto: ChangePasswordDto,
//     currentUser: User
//   ): Promise<User> {

//     // 1. Foydalanuvchini olish
//     const user = await this.userRepository.findOne({
//       where: { id },
//       relations: ['createdBy'],
//     });

//     if (!user) {
//       throw new NotFoundException('Foydalanuvchi topilmadi');
//     }

//     // 2. Ruxsat tekshirish
//     const isAdmin = currentUser.role === Role.Admin;
//     const isClient = currentUser.role === Role.Client;
//     const isOwn = currentUser.id === id;
//     const isCreator = user.createdBy?.id === currentUser.id;

//     if (!isAdmin && !(isClient && (isOwn || isCreator)) && !isOwn) {
//       throw new ForbiddenException("Ushbu foydalanuvchining parolini o'zgartirishga ruxsat yo‘q");
//     }

//     // 3. Parolni yangilash
//     user.password = await bcrypt.hash(dto.password, 10);

//     return this.userRepository.save(user);
//   }


//   // 🔹 Foydalanuvchini username orqali topish
//   async findOneByUsername(username: string): Promise<User> {
//     const user = await this.userRepository.findOne({ where: { username } });
//     const allUsers = await this.userRepository.find();
//     if (!user) {
//       throw new NotFoundException('Parol yoki username xatottto');
//     }
//     return user;
//   }




//   // jwt token orqali
//   // 
//   async findById(id: number): Promise<User | null> {
//     return await this.userRepository.findOne({ where: { id } });
//   }





// }


import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import UserDto from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { instanceToPlain } from 'class-transformer';
import ChangePasswordDto from './dto/password.dto';
import * as dayjs from 'dayjs';
import { Role } from 'common/enums/role.enum';

@Injectable()
export class UserService {
  // 🔹 Konstantalar class darajasida
  private readonly PASSWORD_SALT_ROUNDS = 10;
  private readonly TOKEN_EXPIRY_MONTHS = 1;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  // 🔹 Utility metodlar
  private generateExpiryTime(): number {
    return Math.floor(
      dayjs().add(this.TOKEN_EXPIRY_MONTHS, 'month').toDate().getTime() / 1000
    );
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.PASSWORD_SALT_ROUNDS);
  }

  private validateRolePermission(
    currentUserRole: Role,
    targetRole: Role
  ): void {
    const permissions = {
      [Role.Admin]: [Role.Admin, Role.Agent, Role.Client],
      [Role.Agent]: [Role.Client],
      [Role.Client]: [Role.Cashier],
    };

    const allowedRoles = permissions[currentUserRole];
    
    if (!allowedRoles || !allowedRoles.includes(targetRole)) {
      const messages = {
        [Role.Admin]: "Admin Cashier yaratolmaydi",
        [Role.Agent]: "Agent faqat Client yaratishi mumkin",
        [Role.Client]: "Client faqat Cashier yaratishi mumkin",
      };
      throw new ForbiddenException(
        messages[currentUserRole] || "Sizda user yaratish huquqi yo'q"
      );
    }
  }

  private canAccessUser(user: User, currentUser: User): boolean {
    // O'zi bo'lsa
    if (user.id === currentUser.id) return true;
    
    // Admin hammani ko'radi
    if (currentUser.role === Role.Admin) return true;
    
    // Agent/Client o'z yaratganlarini ko'radi
    if (
      (currentUser.role === Role.Agent || currentUser.role === Role.Client) &&
      user.createdBy?.id === currentUser.id
    ) {
      return true;
    }
    
    return false;
  }

  // 🔹 CRUD operatsiyalar
  async create(
    data: UserDto,
    createdById: number,
    currentUserRole: Role
  ): Promise<User> {
    // Role huquqini tekshirish
    this.validateRolePermission(currentUserRole, data.role);

    // Parallel ravishda hash va expiry generatsiya
    const [hashPassword, exp] = await Promise.all([
      this.hashPassword(data.password),
      Promise.resolve(this.generateExpiryTime())
    ]);

    // User yaratish
    const user = this.userRepository.create({
      ...data,
      password: hashPassword,
      expiry_date: exp,
      createdBy: createdById ? ({ id: createdById } as User) : undefined
    });

    const savedUser = await this.userRepository.save(user);
    return instanceToPlain(savedUser) as User;
  }

  async findAll(userId: number, role: Role): Promise<any[]> {
    // Role va filter mapping
    const roleFilters = {
      [Role.Admin]: { role: Role.Client },
      [Role.Agent]: { role: Role.Client, createdBy: { id: userId } },
      [Role.Client]: { role: Role.Cashier, createdBy: { id: userId } },
    };

    const filter = roleFilters[role];
    if (!filter) {
      throw new BadRequestException('Invalid role');
    }

    const users = await this.userRepository.find({
      where: filter,
      relations: role !== Role.Admin ? ['createdBy'] : []
    });

    return instanceToPlain(users) as any[];
  }

  async findOne(id: number, currentUser: User): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    if (!this.canAccessUser(user, currentUser)) {
      throw new ForbiddenException('Siz bu foydalanuvchini ko\'rish huquqiga ega emassiz');
    }

    return instanceToPlain(user) as User;
  }

  async delete(id: number, currentUser: User): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    // Agent va Cashier o'chira olmaydi
    if ([Role.Agent, Role.Cashier].includes(currentUser.role)) {
      throw new ForbiddenException("Sizda foydalanuvchi o'chirish huquqi yo'q");
    }

    // Admin hammani o'chiradi
    if (currentUser.role === Role.Admin) {
      await this.userRepository.delete(id);
      return;
    }

    // Client faqat o'zi yaratganlarini o'chiradi
    if (currentUser.role === Role.Client) {
      if (user.createdBy?.id !== currentUser.id) {
        throw new ForbiddenException(
          "Siz faqat o'zingiz yaratgan foydalanuvchilarni o'chira olasiz"
        );
      }
      await this.userRepository.delete(id);
      return;
    }

    throw new ForbiddenException("Sizda foydalanuvchi o'chirish huquqi yo'q");
  }

  async update(
    id: number,
    data: Partial<UserDto>,
    currentUser: User
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['createdBy']
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    // Parolni update qilishni taqiqlash
    if (data.password) {
      throw new BadRequestException("Parolni o'zgartirish huquqi yo'q");
    }

    const isOwnAccount = currentUser.id === id;
    const isCreator = user.createdBy?.id === currentUser.id;
    const isAdmin = currentUser.role === Role.Admin;
    const isClient = currentUser.role === Role.Client;

    // Ruxsat tekshirish
    if (!isAdmin) {
      if (isClient) {
        if (data.role && data.role !== user.role) {
          throw new ForbiddenException("Client foydalanuvchi rolini o'zgartira olmaydi");
        }
        if (!isOwnAccount && !isCreator) {
          throw new ForbiddenException(
            "Client faqat o'zini yoki o'zi yaratgan xodimlarni yangilay oladi"
          );
        }
      } else if (!isOwnAccount) {
        throw new ForbiddenException("Siz faqat o'z profilingizni yangilay olasiz");
      }
    }

    // Username tekshirish
    if (data.username && data.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: data.username }
      });

      if (existingUser) {
        throw new ConflictException(`Username '${data.username}' allaqachon mavjud`);
      }
    }

    // Yangilash
    const { password, ...updateData } = data;
    Object.assign(user, updateData);

    await this.userRepository.save(user);
    return { message: "Foydalanuvchi muvaffaqiyatli yangilandi" };
  }

  async changePassword(
    id: number,
    dto: ChangePasswordDto,
    currentUser: User
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const isAdmin = currentUser.role === Role.Admin;
    const isClient = currentUser.role === Role.Client;
    const isOwn = currentUser.id === id;
    const isCreator = user.createdBy?.id === currentUser.id;

    // Ruxsat: Admin, yoki Client (o'zi yoki o'zi yaratgan), yoki o'z profili
    if (!isAdmin && !(isClient && (isOwn || isCreator)) && !isOwn) {
      throw new ForbiddenException("Ushbu foydalanuvchining parolini o'zgartirishga ruxsat yo'q");
    }

    user.password = await this.hashPassword(dto.password);
    return this.userRepository.save(user);
  }

  async findOneByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } });
    
    if (!user) {
      throw new NotFoundException('Parol yoki username xato');
    }
    
    return user;
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}