import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 👇 THAY ĐỔI QUAN TRỌNG NHẤT Ở ĐÂY:
  // Thay vì cấu hình phức tạp, mình mở toang cửa cho Frontend vào
  app.enableCors(); 

  // --- Giữ nguyên đoạn Health Check xịn xò này ---
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
  // -----------------------------------------------

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
