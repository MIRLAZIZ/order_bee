import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { ReducedInterface } from 'common/interface/reduced.interface';
// import TelegramBot from 'node-telegram-bot-api';

@Injectable()
@Processor('sales-queue')
export class NotificationProcessor extends WorkerHost {
  private io: Server;
  // private telegramBot: TelegramBot;

  constructor(
     private readonly notificationsGateway: NotificationsGateway) {
    super();
  }

 

  async process(job: Job<ReducedInterface>) {
    if (job.name !== 'sale-created') return;

    

    console.log(job.data  );
    


    this.notificationsGateway.sendNotification(job.data);


  }
}
