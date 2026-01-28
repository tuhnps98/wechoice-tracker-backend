import { registerAs } from '@nestjs/config';

export default registerAs('typeorm', () => ({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  synchronize: false, // [QUAN TRỌNG] Đổi thành false để nó không sửa bậy Database nữa
  ssl: {
    rejectUnauthorized: false,
  },
}));
