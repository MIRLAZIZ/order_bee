import { ScheduleModule } from '@nestjs/schedule';
import { Module } from '@nestjs/common';
import { UserModule } from 'src/meta-user/user.module';
import { SubscriptionCron } from './subscription.cron';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UserModule,
  ],
  providers: [SubscriptionCron],
})
export class TasksModule {}