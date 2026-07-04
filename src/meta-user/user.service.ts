// import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { User } from './user.entity';
// import UserDto from './dto/user.dto';
// import * as bcrypt from 'bcrypt';
// import { instanceToPlain } from 'class-transformer';
// import ChangePasswordDto from './dto/password.dto';
// import * as dayjs from 'dayjs';
// import { Role } from 'common/enums/role.enum';

// @Injectable()
// export class UserService implements OnModuleInit   {
//   // 🔹 Konstantalar class darajasida
//   private readonly PASSWORD_SALT_ROUNDS = 10;
//   private readonly TOKEN_EXPIRY_MONTHS = 1;

//   constructor(
//     @InjectRepository(User)
//     private readonly userRepository: Repository<User>
//   ) { }

//   async onModuleInit() {
//     const count = await this.userRepository.count();
//     if (count === 0) {
//       const user = new User();
//       user.username = 'admin';
//       user.fullName = "Mirlaziz Mirtolipov"
//       user.password = await this.hashPassword('admin');
//       user.role = Role.Admin;
//       await this.userRepository.save(user);
//     }
//   }

//   // 🔹 Utility metodlar
//   private generateExpiryTime(): number {
//     return Math.floor(
//       dayjs().add(this.TOKEN_EXPIRY_MONTHS, 'month').toDate().getTime() / 1000
//     );
//   }

//   private async hashPassword(password: string): Promise<string> {
//     return bcrypt.hash(password, this.PASSWORD_SALT_ROUNDS);
//   }

//   private validateRolePermission(
//     currentUserRole: Role,
//     targetRole: Role
//   ): void {
//     const permissions = {
//       [Role.Admin]: [Role.Admin, Role.Agent, Role.Client],
//       [Role.Agent]: [Role.Client],
//       [Role.Client]: [Role.Cashier],
//     };

//     const allowedRoles = permissions[currentUserRole];

//     if (!allowedRoles || !allowedRoles.includes(targetRole)) {
//       const messages = {
//         [Role.Admin]: "Admin Cashier yaratolmaydi",
//         [Role.Agent]: "Agent faqat Client yaratishi mumkin",
//         [Role.Client]: "Client faqat Cashier yaratishi mumkin",
//       };
//       throw new ForbiddenException(
//         messages[currentUserRole] || "Sizda user yaratish huquqi yo'q"
//       );
//     }
//   }

//   private canAccessUser(user: User, currentUser: User): boolean {
//     // O'zi bo'lsa
//     if (user.id === currentUser.id) return true;

//     // Admin hammani ko'radi
//     if (currentUser.role === Role.Admin) return true;

//     // Agent/Client o'z yaratganlarini ko'radi
//     if (
//       (currentUser.role === Role.Agent || currentUser.role === Role.Client) &&
//       user.createdBy?.id === currentUser.id
//     ) {
//       return true;
//     }

//     return false;
//   }

//   // 🔹 CRUD operatsiyalar
//   async create(
//     data: UserDto,
//     createdById: number,
//     currentUserRole: Role
//   ): Promise<User> {
//     // Role huquqini tekshirish
//     this.validateRolePermission(currentUserRole, data.role);

//     // Parallel ravishda hash va expiry generatsiya
//     const [hashPassword, exp] = await Promise.all([
//       this.hashPassword(data.password),
//       Promise.resolve(this.generateExpiryTime())
//     ]);

//     // User yaratish
//     const user = this.userRepository.create({
//       ...data,
//       password: hashPassword,
//       expiry_date: exp,
//       createdBy: createdById ? ({ id: createdById } as User) : undefined
//     });

//     const savedUser = await this.userRepository.save(user);
//     return instanceToPlain(savedUser) as User;
//   }

//   async findAll(userId: number, role: Role): Promise<any[]> {
//     // Role va filter mapping
//     const roleFilters = {
//       [Role.Admin]: { role: Role.Client },
//       [Role.Agent]: { role: Role.Client, createdBy: { id: userId } },
//       [Role.Client]: { role: Role.Cashier, createdBy: { id: userId } },
//     };

//     const filter = roleFilters[role];
//     if (!filter) {
//       throw new BadRequestException('Invalid role');
//     }

//     const users = await this.userRepository.find({
//       where: filter,
//       relations: role !== Role.Admin ? ['createdBy'] : []
//     });

//     return instanceToPlain(users) as any[];
//   }

//   async findOne(id: number, currentUser: User): Promise<User> {
//     const user = await this.userRepository.findOne({
//       where: { id },
//       relations: ['createdBy'],
//     });

//     if (!user) {
//       throw new NotFoundException('Foydalanuvchi topilmadi');
//     }

//     if (!this.canAccessUser(user, currentUser)) {
//       throw new ForbiddenException('Siz bu foydalanuvchini ko\'rish huquqiga ega emassiz');
//     }

//     return instanceToPlain(user) as User;
//   }

//   async delete(id: number, currentUser: User): Promise<void> {
//     const user = await this.userRepository.findOne({
//       where: { id },
//       relations: ['createdBy'],
//     });

//     if (!user) {
//       throw new NotFoundException('Foydalanuvchi topilmadi');
//     }

//     // Agent va Cashier o'chira olmaydi
//     if ([Role.Agent, Role.Cashier].includes(currentUser.role)) {
//       throw new ForbiddenException("Sizda foydalanuvchi o'chirish huquqi yo'q");
//     }

//     // Admin hammani o'chiradi
//     if (currentUser.role === Role.Admin) {
//       await this.userRepository.delete(id);
//       return;
//     }

//     // Client faqat o'zi yaratganlarini o'chiradi
//     if (currentUser.role === Role.Client) {
//       if (user.createdBy?.id !== currentUser.id) {
//         throw new ForbiddenException(
//           "Siz faqat o'zingiz yaratgan foydalanuvchilarni o'chira olasiz"
//         );
//       }
//       await this.userRepository.delete(id);
//       return;
//     }

//     throw new ForbiddenException("Sizda foydalanuvchi o'chirish huquqi yo'q");
//   }

//   async update(
//     id: number,
//     data: Partial<UserDto>,
//     currentUser: User
//   ): Promise<{ message: string }> {
//     const user = await this.userRepository.findOne({
//       where: { id },
//       relations: ['createdBy']
//     });

//     if (!user) {
//       throw new NotFoundException('Foydalanuvchi topilmadi');
//     }

//     // Parolni update qilishni taqiqlash
//     if (data.password) {
//       throw new BadRequestException("Parolni o'zgartirish huquqi yo'q");
//     }

//     const isOwnAccount = currentUser.id === id;
//     const isCreator = user.createdBy?.id === currentUser.id;
//     const isAdmin = currentUser.role === Role.Admin;
//     const isClient = currentUser.role === Role.Client;

//     // Ruxsat tekshirish
//     if (!isAdmin) {
//       if (isClient) {
//         if (data.role && data.role !== user.role) {
//           throw new ForbiddenException("Client foydalanuvchi rolini o'zgartira olmaydi");
//         }
//         if (!isOwnAccount && !isCreator) {
//           throw new ForbiddenException(
//             "Client faqat o'zini yoki o'zi yaratgan xodimlarni yangilay oladi"
//           );
//         }
//       } else if (!isOwnAccount) {
//         throw new ForbiddenException("Siz faqat o'z profilingizni yangilay olasiz");
//       }
//     }

//     // Username tekshirish
//     if (data.username && data.username !== user.username) {
//       const existingUser = await this.userRepository.findOne({
//         where: { username: data.username }
//       });

//       if (existingUser) {
//         throw new ConflictException(`Username '${data.username}' allaqachon mavjud`);
//       }
//     }

//     // Yangilash
//     const { password, ...updateData } = data;
//     Object.assign(user, updateData);

//     await this.userRepository.save(user);
//     return { message: "Foydalanuvchi muvaffaqiyatli yangilandi" };
//   }

//   async changePassword(
//     id: number,
//     dto: ChangePasswordDto,
//     currentUser: User
//   ): Promise<User> {
//     const user = await this.userRepository.findOne({
//       where: { id },
//       relations: ['createdBy'],
//     });

//     if (!user) {
//       throw new NotFoundException('Foydalanuvchi topilmadi');
//     }

//     const isAdmin = currentUser.role === Role.Admin;
//     const isClient = currentUser.role === Role.Client;
//     const isOwn = currentUser.id === id;
//     const isCreator = user.createdBy?.id === currentUser.id;

//     // Ruxsat: Admin, yoki Client (o'zi yoki o'zi yaratgan), yoki o'z profili
//     if (!isAdmin && !(isClient && (isOwn || isCreator)) && !isOwn) {
//       throw new ForbiddenException("Ushbu foydalanuvchining parolini o'zgartirishga ruxsat yo'q");
//     }

//     user.password = await this.hashPassword(dto.password);
//     return this.userRepository.save(user);
//   }

//   async findOneByUsername(username: string): Promise<User> {
//     const user = await this.userRepository.findOne({ where: { username } });

//     if (!user) {
//       throw new NotFoundException('Parol yoki username xato');
//     }

//     return user;
//   }

//   async findById(id: number): Promise<User | null> {
//     return this.userRepository.findOne({ where: { id } });
//   }

//   async findByUsername(username: string): Promise<User | null> {
//     return this.userRepository.findOne({ where: { username } });
//   }

//   async saveTelegramId(user: User, telegramId: number) {
//     user.telegramId = telegramId;
//     return this.userRepository.save(user);
//   }

//   async saveTelegramGroupId(user: User, groupId: number) {
//     user.telegramGroupId = String(groupId);
//     return this.userRepository.save(user);
//   }

//   async findByTelegramId(telegramId: number): Promise<User | null> {
//     return this.userRepository.findOne({ where: { telegramId } });
//   }
//   async findByRoleClient(): Promise<User[]> {
//     return this.userRepository.find({ where: { role: Role.Client } });
//   }
// }






import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import UserDto from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { instanceToPlain } from 'class-transformer';
import ChangePasswordDto from './dto/password.dto';
import   dayjs  from 'dayjs';
import { Role } from 'common/enums/role.enum';
import { SubscriptionStatus } from 'common/enums/subscription-status.enum';

@Injectable()
export class UserService implements OnModuleInit {
  // 🔹 Konstantalar class darajasida
  private readonly PASSWORD_SALT_ROUNDS = 10;
  private readonly TRIAL_DAYS = 7;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) { }

  async onModuleInit() {
    const count = await this.userRepository.count();
    if (count === 0) {
      const user = new User();
      user.username = 'admin';
      user.fullName = "Mirlaziz Mirtolipov";
      user.password = await this.hashPassword('admin');
      user.role = Role.Admin;
      // Admin uchun subscription cheklovi kerak emas, shuning uchun uzoq muddat beramiz
      user.subscriptionStatus = SubscriptionStatus.ACTIVE;
      user.expiryDate = dayjs().add(100, 'year').toDate();
      await this.userRepository.save(user);
    }
  }

  // 🔹 Utility metodlar
  private generateTrialExpiry(): Date {
    return dayjs().add(this.TRIAL_DAYS, 'day').toDate();
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
    if (user.id === currentUser.id) return true;
    if (currentUser.role === Role.Admin) return true;
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
    this.validateRolePermission(currentUserRole, data.role);

    const hashPassword = await this.hashPassword(data.password);

    // Faqat Client (do'kon egasi) roli uchun trial beriladi.
    // Agent/Cashier kabi rollar do'kon egasining obunasiga bog'liq bo'lgani uchun
    // ularga alohida trial kerak emas.
    const isSubscribable = data.role === Role.Client;

    const user = this.userRepository.create({
      ...data,
      password: hashPassword,
      subscriptionStatus: isSubscribable ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
      expiryDate: isSubscribable
        ? this.generateTrialExpiry()
        : dayjs().add(100, 'year').toDate(),
      createdBy: createdById ? ({ id: createdById } as User) : undefined
    });

    const savedUser = await this.userRepository.save(user);
    return instanceToPlain(savedUser) as User;
  }

// 🔹 Payment muvaffaqiyatli bo'lgandan keyin chaqiriladi.
// Agar foydalanuvchining amaldagi muddati (Trial yoki Active)
// hali tugamagan bo'lsa, yangi 1 oy mavjud muddat ustiga qo'shiladi.
// Agar muddat tugagan bo'lsa, hisob bugungi kundan boshlanadi.
async activateSubscription(userId: number): Promise<User> {
  // 1. Userni bazadan olamiz
  const user = await this.userRepository.findOneOrFail({
    where: { id: userId },
  });

  const now = dayjs();

  /**
   * Hisoblash boshlanadigan sana:
   *
   * Misol 1:
   * Bugun:      2026-07-04
   * ExpiryDate: 2026-07-10 (Trial hali tugamagan)
   *
   * Natija:
   * 2026-08-10
   *
   * ------------------------------------
   *
   * Misol 2:
   * Bugun:      2026-07-04
   * ExpiryDate: 2026-08-15 (Active)
   *
   * Natija:
   * 2026-09-15
   *
   * ------------------------------------
   *
   * Misol 3:
   * Bugun:      2026-07-04
   * ExpiryDate: 2026-06-20 (Tugagan)
   *
   * Natija:
   * 2026-08-04
   */
  const base =
    user.expiryDate && dayjs(user.expiryDate).isAfter(now)
      ? dayjs(user.expiryDate)
      : now;

  // 2. Obunani aktiv qilamiz
  user.subscriptionStatus = SubscriptionStatus.ACTIVE;

  // 3. Mavjud muddat ustiga 1 kalendar oy qo'shamiz
  user.expiryDate = base.add(1, 'month').toDate();

  // 4. Oxirgi to'lov vaqtini saqlaymiz
  user.lastPaymentAt = now.toDate();

  // 5. Bazaga saqlaymiz
  return await this.userRepository.save(user);
}

  // 🔹 Admin qo'lda qarzga vaqt qo'shganda chaqiriladi
  async extendManually(userId: number, days: number, debtAmount: number, note: string): Promise<User> {
    const user = await this.userRepository.findOneOrFail({ where: { id: userId } });

    user.expiryDate = dayjs(user.expiryDate).add(days, 'day').toDate();
    user.manualExtensionCount += 1;
    user.debtAmount = Number(user.debtAmount) + debtAmount;
    user.adminNote = note;
    user.subscriptionStatus = SubscriptionStatus.ACTIVE;

    return this.userRepository.save(user);
  }

  // 🔹 Har kuni cron job orqali chaqiriladi (muddati o'tganlarni EXPIRED qiladi)
  async expireOverdueSubscriptions(): Promise<number> {
    const result = await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ subscriptionStatus: SubscriptionStatus.EXPIRED })
      .where('expiryDate < :now', { now: new Date() })
      .andWhere('subscriptionStatus != :expired', { expired: SubscriptionStatus.EXPIRED })
      .andWhere('role = :role', { role: Role.Client })
      .execute();

    return result.affected ?? 0;
  }

  async findAll(userId: number, role: Role): Promise<any[]> {
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

    if ([Role.Agent, Role.Cashier].includes(currentUser.role)) {
      throw new ForbiddenException("Sizda foydalanuvchi o'chirish huquqi yo'q");
    }

    if (currentUser.role === Role.Admin) {
      await this.userRepository.delete(id);
      return;
    }

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

    if (data.password) {
      throw new BadRequestException("Parolni o'zgartirish huquqi yo'q");
    }

    const isOwnAccount = currentUser.id === id;
    const isCreator = user.createdBy?.id === currentUser.id;
    const isAdmin = currentUser.role === Role.Admin;
    const isClient = currentUser.role === Role.Client;

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

    if (data.username && data.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: data.username }
      });

      if (existingUser) {
        throw new ConflictException(`Username '${data.username}' allaqachon mavjud`);
      }
    }

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

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async saveTelegramId(user: User, telegramId: number) {
    user.telegramId = telegramId;
    return this.userRepository.save(user);
  }

  async saveTelegramGroupId(user: User, groupId: number) {
    user.telegramGroupId = String(groupId);
    return this.userRepository.save(user);
  }

  async findByTelegramId(telegramId: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { telegramId } });
  }

  async findByRoleClient(): Promise<User[]> {
    return this.userRepository.find({ where: { role: Role.Client } });
  }
}