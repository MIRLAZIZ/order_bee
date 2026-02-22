import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
// import TelegramBot from 'node-telegram-bot-api';

@Injectable()
@Processor('sales-queue')
export class NotificationProcessor extends WorkerHost {
  private io: Server;
  // private telegramBot: TelegramBot;

  constructor(
     private readonly notificationsGateway: NotificationsGateway) {
    super();
    // Telegram bot tokenni .env fayldan olish tavsiya etiladi
    // this.telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN || '', { polling: false });
  }

  // setSocketServer(io: Server) {
  //   this.io = io; // NestJS Gateway orqali inject qilinadi
  // }

  async process(job: Job<any>) {
    if (job.name !== 'sale-created') return;

    console.log(job.data  );
    

    // const { sales, totalSum, warnings, userTelegramId } = job.data;


    this.notificationsGateway.sendNotification(job.data);

  

    // -----------------------
    // 2️⃣ Telegram orqali yuborish
    // -----------------------
    // if (userTelegramId) {
    //   const message = `Yangi sale:\nUmumiy summa: ${totalSum} so'm\n${sales
    //     .map(s => `${s.quantity}x ${s.product.name} (${s.total} so'm)`)
    //     .join('\n')}`;
    //   // await this.telegramBot.sendMessage(userTelegramId, message);
    // }

    // 🔹 Bu yerda boshqa notification turlari ham qo‘shish mumkin
  }
}
