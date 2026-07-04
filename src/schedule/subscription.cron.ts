import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UserService } from '../meta-user/user.service';

@Injectable()
export class SubscriptionCron {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Cron('4 11 * * *', {
    timeZone: 'Asia/Tashkent',
  })
  async handleCron() {
    console.log('Cron ishladiiiiiiiiiiiiiiiii');

    // bu yerda userlarni tekshirasiz
  }
}