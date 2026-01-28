import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { Snapshot } from './snapshot.entity';
import { Candidate } from '../candidate/candidate.entity';
import { Category } from '../category/category.entity';

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);
  private readonly apiUrl: string;

  constructor(
    @InjectRepository(Snapshot)
    private snapshotRepository: Repository<Snapshot>,
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('API_URL');
  }

  // Chạy mỗi 30 phút một lần (hoặc tùy chỉnh)
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    this.logger.log('Starting Snapshot Sync process...');
    
    // 1. Lấy danh sách hạng mục
    const categories = await this.categoryRepository.find();
    if (!categories.length) {
      this.logger.warn('No categories found. Skipping snapshot.');
      return;
    }

    const headers = {
      Referer: this.configService.get<string>('API_REFERER') ?? '',
      'User-Agent': 'Mozilla/5.0 (compatible; WeChoiceTracker/1.0)',
    };

    for (const category of categories) {
      try {
        // 2. Tạo URL chuẩn (dùng awardId)
        const separator = this.apiUrl.includes('?') ? '&' : '?';
        const url = `${this.apiUrl}${separator}awardId=${category.id}`;

        const response = await firstValueFrom(
          this.httpService.get(url, { headers })
        );
        
        const result = response.data;
        // Kiểm tra cấu trúc trả về của API
        const candidatesList = result.Data || result.data || [];

        if (Array.isArray(candidatesList)) {
          for (const item of candidatesList) {
            // Lấy ID và Vote (xử lý an toàn)
            const candidateId = String(item.m || item.id); // Chuyển về String cho chắc
            const voteCount = item.list?.[0]?.v ?? item.vote ?? item.totalVotes ?? 0;
            const candidateName = item.n || item.name || "Unknown";

            // 3. [QUAN TRỌNG] Kiểm tra xem ứng viên đã có trong DB chưa
            let candidate = await this.candidateRepository.findOne({ 
                where: { id: candidateId } 
            });

            // Nếu chưa có -> TẠO LUÔN (Fix lỗi Foreign Key)
            if (!candidate) {
                this.logger.log(`Creating missing candidate: ${candidateName} (${candidateId})`);
                candidate = this.candidateRepository.create({
                    id: candidateId,
                    name: candidateName,
                    categoryId: String(category.id), // Lưu String
                });
                await this.candidateRepository.save(candidate);
            }

            // 4. Lưu lịch sử vote (Snapshot)
            const snapshot = this.snapshotRepository.create({
              candidateId: candidateId,
              totalVotes: voteCount,
            });
            await this.snapshotRepository.save(snapshot);
          }
        }
      } catch (err) {
        this.logger.error(`Failed snapshot for category ${category.id}: ${err.message}`);
      }
    }
    this.logger.log('Snapshot sync completed.');
  }
}
