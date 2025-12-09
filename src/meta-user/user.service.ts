import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
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
export class UserService implements OnModuleInit   {
  // 🔹 Konstantalar class darajasida
  private readonly PASSWORD_SALT_ROUNDS = 10;
  private readonly TOKEN_EXPIRY_MONTHS = 1;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) { }

  async onModuleInit() {
    const count = await this.userRepository.count();
    if (count === 0) {
      const user = new User();
      user.username = 'admin';
      user.fullName = "Mirlaziz Mirtolipov"
      user.password = await this.hashPassword('admin');
      user.role = Role.Admin;
      await this.userRepository.save(user);
    }
  }

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