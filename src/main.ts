import 'reflect-metadata';
// 1. Thêm thư viện DNS
import * as dns from 'dns'; 
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// 2. ÉP BUỘC DÙNG IPV4 (Chìa khóa sửa lỗi ENETUNREACH)
// Lệnh này bắt Node.js phải tìm địa chỉ IPv4 trước, bỏ qua IPv6 bị lỗi của Render
try {
  dns.setDefaultResultOrder('ipv4first');
  console.log('✅ [FIX] DNS Resolution forced to IPv4 successfully.');
} catch (e) {
  console.error('⚠️ [FIX] Could not set DNS result order:', e);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'https://wechoicetracker.vercel.app']; // Thêm domain frontend của bạn nếu có

  app.enableCors({
    origin: '*', // Tạm thời mở tất cả để test cho dễ, sau này siết lại sau
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Health check endpoint
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
