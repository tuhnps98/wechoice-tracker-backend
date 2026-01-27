import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm'; // Bỏ TypeOrmModuleOptions cho gọn
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { CandidateModule } from './candidate/candidate.module';
import { CategoryModule } from './category/category.module';
import { SnapshotModule } from './snapshot/snapshot.module';
import { StatsModule } from './stats/stats.module';
import { RealtimeModule } from './realtime/realtime.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      // Bỏ dòng load: [typeormConfig] để tránh xung đột
    }),

    // Cache module
    CacheModule.register({
      isGlobal: true,
      ttl: 600000, 
      max: 100, 
    }),

    // --- CẤU HÌNH TRỰC TIẾP TẠI ĐÂY ---
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        // Lấy URL từ biến môi trường
        url: config.get('DATABASE_URL'),
        
        autoLoadEntities: true,
        synchronize: true,
        
        // BẮT BUỘC: Cấu hình bỏ qua lỗi bảo mật SSL của Supabase
        ssl: {
          rejectUnauthorized: false, 
        },
        
        // Tăng timeout để tránh lỗi mạng chập chờn
        extra: {
          max: 3,
          connectionTimeoutMillis: 10000,
        }
      }),
    }),
    // -----------------------------------

    CandidateModule,
    CategoryModule,
    ScheduleModule.forRoot(),
    HttpModule.register({ timeout: 5000 }),
    SnapshotModule,
    StatsModule,
    RealtimeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
