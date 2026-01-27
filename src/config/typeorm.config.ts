import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export default registerAs(
  'typeorm',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    // SỬA 1: Code sẽ tự tìm DATABASE_URL trước (khớp với Render của ông)
    url: process.env.DATABASE_URL || process.env.DB_URL,
    
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    
    autoLoadEntities: true,
    synchronize: true,
    
    // SỬA 2: BẮT BUỘC phải có cái này thì Supabase mới cho kết nối
    ssl: {
      rejectUnauthorized: false,
    },

    migrations: [join(__dirname, '../..', 'migrations', '*.{js,ts}')],
    migrationsRun: false,
    extra: {
      max: 3,
      connectionTimeoutMillis: 5000,
    },
  }),
);
