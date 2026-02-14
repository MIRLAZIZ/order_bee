import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './meta-user/user.module';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthMiddleware } from 'common/middleware/jwt-auth.middleware';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from 'common/guards/roles.guard';
import { UnitsModule } from './units/units.module';
import { ProductsModule } from './products/products.module';
// import { CategoriesModule } from './categories/categories.module';
import { SalesModule } from './sales/sales.module';
import { StatisticsModule } from './statistics/statistics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'market_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      // dropSchema: true, // ⚠️ Birinchi ishga tushirishda barcha jadvallarni o'chiradi
      // logging: true // Nimalar bo'layotganini ko'rish uchun
      // migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      // migrationsRun: true, // ✅ Avtomatik migration'larni ishga tushiradi
    }),
    AuthModule,
    UserModule,
    UnitsModule,
    ProductsModule,
    SalesModule,
    StatisticsModule,
    NotificationsModule,
    // CategoriesModule,
    EventEmitterModule.forRoot({
      // set this to `true` to use wildcards
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
      verboseMemoryLeak: false

    
    }),

  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtAuthMiddleware)
      .exclude({ path: 'auth/login', method: RequestMethod.POST },
        { path: 'uploads/(.*)', method: RequestMethod.ALL }
      )
      .forRoutes('*')

  }
}
