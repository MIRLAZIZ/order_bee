import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
    // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Faqat DTO dagi maydonlar qabul qilinsin
    forbidNonWhitelisted: true, // Qo‘shimcha maydon bo‘lsa xato qaytarsin
    transform: true, // Avtomatik DTO ga o‘girish uchun
  }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
