import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { Candidate } from '../candidate/candidate.entity';
import { Category } from '../category/category.entity';
import { Snapshot } from '../snapshot/snapshot.entity';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('Realtime');
  private readonly apiUrl: string;

  private readonly cachedData: any = {
    updatedAt: new Date().toISOString(),
    data: [],
    status: 'Fetching',
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Snapshot)
    private readonly snapshotRepository: Repository<Snapshot>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
  ) {
    this.apiUrl = this.configService.get<string>('API_URL') ?? '';
  }

  getCachedData() {
    return this.cachedData;
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async getVotes() {
    // this.logger.log('Fetching new votes from external API...');
    
    // 1. Lấy danh sách Categories từ DB Supabase
    const categories = await this.categoryRepository.find();

    if (!categories || categories.length === 0) {
      // this.logger.warn('No categories found in database');
      return { updatedAt: new Date().toISOString(), data: [] };
    }

    try {
      const headers = {
        Referer: this.configService.get<string>('API_REFERER') ?? '',
        Cookie: this.configService.get<string>('API_COOKIE') ?? '',
        'User-Agent': 'Mozilla/5.0 (compatible; WeChoiceTracker/1.0)',
      };

      let allTransformedData: any[] = [];

      // 2. Chạy vòng lặp qua từng hạng mục để lấy số liệu
      // Gọi API cho từng category
      for (const category of categories) {
        // [SỬA ĐỔI QUAN TRỌNG]: Đổi lstId thành awardId
        // Tự động kiểm tra xem API_URL đã có dấu '?' chưa để thêm '&' hoặc '?' cho đúng
        const separator = this.apiUrl.includes('?') ? '&' : '?';
        const apiUrlWithCategory = `${this.apiUrl}${separator}awardId=${category.id}`;

        try {
          const response = await firstValueFrom(
            this.httpService.get(apiUrlWithCategory, {
              headers,
              responseType: 'json',
            }),
          );
          const result = response.data;

          // Kiểm tra dữ liệu trả về (Hỗ trợ cả cấu trúc cũ và mới)
          if (!result || (!result.Success && !result.data)) {
            continue;
          }

          const rawList = result.Data || result.data || [];

          // 3. Xử lý dữ liệu và Cập nhật Database
          const transformedData = await Promise.all(
            rawList.map(async (item: any) => {
              // Mapping thông minh: Tìm ID dù nó là 'm' (cũ) hay 'id' (mới)
              const candidateId = item.m || item.id;
              // Mapping thông minh: Tìm Vote dù nó là 'v' (cũ) hay 'totalVotes' (mới)
              const totalVotes = item.list?.[0]?.v ?? item.vote ?? item.totalVotes ?? 0;
              // Lấy tên từ API (nếu có)
              const apiName = item.n || item.name || item.candidateName;

              // Tìm ứng viên trong Database Supabase
              const candidate = await this.candidateRepository.findOne({
                where: { id: candidateId },
                relations: ['category'],
              });

              if (!candidate) {
                return null;
              }

              // --- ĐOẠN CODE TỰ ĐỘNG SỬA TÊN (AUTO-FIX) ---
              // Nếu tên trong DB là "Ứng viên số..." hoặc khác tên API -> Update ngay lập tức
              if (apiName && apiName !== candidate.name) {
                 this.logger.log(`Auto-updating name for ID ${candidate.id}: ${candidate.name} -> ${apiName}`);
                 await this.candidateRepository.update(candidate.id, { name: apiName });
                 candidate.name = apiName; // Cập nhật biến local để hiển thị luôn
              }
              // ---------------------------------------------

              return {
                id: candidate.id,
                name: candidate.name, // Tên này giờ đã chuẩn
                categoryId: candidate.categoryId,
                categoryName: candidate.category?.name || '',
                totalVotes: totalVotes,
              };
            }),
          );

          // Lọc bỏ các giá trị null
          const filteredData = transformedData.filter((item) => item !== null);
          allTransformedData = [...allTransformedData, ...filteredData];
          
        } catch (categoryError) {
           // Silent error to keep log clean
        }
      }

      const payload = {
        updatedAt: new Date().toISOString(),
        data: allTransformedData,
      };

      this.cachedData.updatedAt = payload.updatedAt;
      this.cachedData.data = payload.data;
      this.cachedData.status = 'Success';
      
      return payload;
    } catch (error) {
      this.logger.error('Error fetching votes', error);
    }
  }
}
