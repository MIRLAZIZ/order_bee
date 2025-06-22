import { Injectable, UnauthorizedException } from '@nestjs/common';
import LoginDto from './dto/login.dto';
import { UserService } from 'src/meta-user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/meta-user/user.entity';

@Injectable()
export class AuthService {
    constructor(private readonly userService: UserService, private readonly jwtService: JwtService) {}
// async login(data: LoginDto ): Promise<{}> {
//         const user = await this.userService.findOneByUsername(data.username);
//         if (!user) {
//             throw new Error('User not found');
//         }
//         const isPasswordValid = await bcrypt.compare(data.password, user.password);
//         if (!isPasswordValid) {
//             throw new Error('parol yoki username xato');
//         }

//         const payload = { username: user.username, id: user.id, role: user.role };

//         const token = this.jwtService.sign(payload);
//         return {...user, token };
        
      
//     }

async login(data: LoginDto): Promise<{ user: Partial<User>; token: string }> {
  const user = await this.userService.findOneByUsername(data.username);
  // console.log(user);
  
  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  
  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('parolll yoki username xato');
  }

  const payload = { username: user.username, id: user.id, role: user.role, expiry_date: user.expiry_date, createdBy: user.createdBy };
  const token = this.jwtService.sign(payload);

  const { password, ...result } = user;

  return { user: result, token };
}

}
