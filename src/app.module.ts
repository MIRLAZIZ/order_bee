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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'testdb',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    AuthModule,
    UserModule,
    UnitsModule,
    ProductsModule,
    SalesModule,
    // CategoriesModule
    
  ],
  controllers: [AppController],
  providers: [AppService, {provide: APP_GUARD, useClass: RolesGuard}],
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
