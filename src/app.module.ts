import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import databaseConfig from './config/database.config';
import ordersConfig from './config/orders.config';
import businessesConfig from './config/businesses.config';
import favoritesConfig from './config/favorites.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StaffModule } from './modules/staff/staff.module';
import { CountriesModule } from './modules/countries/countries.module';
import { CitiesModule } from './modules/cities/cities.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { BusinessContractModule } from './modules/businesses/BusinessContract.module';

import { OffersModule } from './modules/offers/offers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';



@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, ordersConfig, businessesConfig, favoritesConfig],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
    }),
    AuthModule,
    UsersModule,
    StaffModule,
    CountriesModule,
    CitiesModule,
    CategoriesModule,
    BusinessesModule,
    BusinessContractModule,
    OffersModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    FavoritesModule,
    PayoutsModule,
    NotificationsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
