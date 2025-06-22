import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/meta-user/user.service';
import * as dayjs from 'dayjs';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) { }


  private getCurrentTimestamp(): number {
    return dayjs().unix(); // toDate().getTime() / 1000 ni o‘rniga
  }

  async use(req: Request, res: Response, next: NextFunction) {

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header not found');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.userService.findOne(decoded.id);

      const nowInSeconds = this.getCurrentTimestamp();

      const compareDate = decoded.expiry_date > nowInSeconds

      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      if(user.role !== 'admin') {
        
        if (!compareDate) {
          throw new UnauthorizedException('Time expired');
        }
      }
      // console.log(decoded);
      

      req['user'] = decoded;
      next();
    } catch (err) {
      throw new UnauthorizedException('umumiy xatolik');
    }
  }
}
