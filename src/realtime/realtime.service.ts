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
    const categories = await this.categoryRepository.find();
    if (!categories || categories.length === 0) return { updatedAt: new Date().toISOString(), data: [] };

    try {
      const headers = {
        Referer: this.configService.get<string>('API_REFERER') ?? '',
        Cookie: this.configService.get<string>('API_COOKIE') ?? '',
        'User-Agent': 'Mozilla/5.0 (compatible; WeChoiceTracker/1.0)',
      };

      let allTransformedData: any[] = [];

      for (const category of categories) {
        const separator = this.apiUrl.includes('?') ? '&' : '?';
        // 👇 Ép kiểu String cho category.id cho chắc ăn
        const apiUrlWithCategory = `${this.apiUrl}${separator}awardId=${String(category.id)}`;

        try {
          const response = await firstValueFrom(
            this.httpService.get(apiUrlWithCategory, { headers, responseType: 'json' }),
          );
          const result = response.data;
          
          if (!result || (!result.Success && !result.data)) continue;
          const rawList = result.Data || result.data || [];

          const transformedData = await Promise.all(
            rawList.map(async (item: any) => {
              // 👇 QUAN TRỌNG: Ép kiểu String ngay lập tức
              const candidateId = String(item.m || item.id);
              const totalVotes = item.list?.[0]?.v ?? item.vote ?? item.totalVotes ?? 0;
              const apiName = item.n || item.name || item.candidateName || "Không rõ";

              if (!candidateId) return null;

              // Tìm trong DB
              let candidate = await this.candidateRepository.findOne({
                where: { id: candidateId }, // ID ở đây giờ chắc chắn là String
                relations: ['category'],
              });

              // Tạo mới nếu chưa có
              if (!candidate) {
                this.logger.log(`New Candidate Found: ${apiName} (${candidateId}) -> Creating...`);
                const newCandidate = this.candidateRepository.create({
                  id: candidateId,
                  name: apiName,
                  category: category, 
                  categoryId: String(category.id) // 👇 Ép kiểu String ở đây nữa
                });
                
                // 👇 Thêm try/catch riêng cho lệnh save để bắt lỗi nếu có
                try {
                    await this.candidateRepository.save(newCandidate);
                    candidate = newCandidate;
                } catch (saveError) {
                    this.logger.error(`Failed to save candidate ${apiName}: ${saveError.message}`);
                    return null; // Bỏ qua thằng lỗi này
                }
              } else {
                if (apiName && apiName !== candidate.name) {
                   await this.candidateRepository.update(candidateId, { name: apiName });
                   candidate.name = apiName;
                }
              }

              return {
                id: candidate.id,
                name: candidate.name,
                categoryId: String(category.id),
                categoryName: category.name,
                totalVotes: totalVotes,
              };
            }),
          );

          allTransformedData = [...allTransformedData, ...transformedData.filter((i) => i !== null)];
        } catch (e) {
           // 👇 LOG LỖI RA ĐỂ BIẾT TẠI SAO (Lúc trước bạn để trống chỗ này nên không biết lỗi gì)
           this.logger.error(`Error processing category ${category.id}: ${e.message}`);
        }
      }

      const payload = {
        updatedAt: new Date().toISOString(),
        data: allTransformedData,
      };

      this.cachedData.updatedAt = payload.updatedAt;
      this.cachedData.data = payload.data;
      
      return payload;
    } catch (error) {
      this.logger.error('Error fetching votes', error);
    }
  }
}
