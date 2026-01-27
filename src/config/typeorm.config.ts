import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export default registerAs(
  'typeorm',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    // Code sẽ lấy link từ Render (đã xóa đuôi sslmode)
    url: process.env.DATABASE_URL || process.env.DB_URL,
    
    // Cấu hình SSL bắt buộc để kết nối Supabase
    ssl: {
      rejectUnauthorized: false, // <--- DÒNG QUAN TRỌNG NHẤT: Bỏ qua kiểm tra chứng chỉ
    },

    autoLoadEntities: true,
    synchronize: true,
    migrations: [join(__dirname, '../..', 'migrations', '*.{js,ts}')],
    migrationsRun: false,
    extra: {
      max: 3,
      connectionTimeoutMillis: 5000,
    },
  }),
);
