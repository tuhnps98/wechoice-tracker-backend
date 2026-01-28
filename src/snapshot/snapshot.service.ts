import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

import { Snapshot } from './snapshot.entity';
import { Candidate } from '../candidate/candidate.entity';
import { Category } from '../category/category.entity';

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);
  private readonly apiUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Snapshot)
    private readonly snapshotRepository: Repository<Snapshot>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {
    this.apiUrl = this.configService.get<string>('API_URL') ?? '';
  }

  async findAll(): Promise<Snapshot[]> {
    return this.snapshotRepository.find({
      relations: ['candidate', 'category'],
      order: { recordedAt: 'DESC' },
    });
  }

  async findByCategory(categoryId: number): Promise<Snapshot[]> {
    return this.snapshotRepository.find({
      where: { id: categoryId },
      relations: ['candidate', 'category'],
      order: { recordedAt: 'DESC' },
    });
  }

  async deleteSnapshots(id: number): Promise<void> {
    await this.snapshotRepository.delete(id);
  }

  async syncVotes() {
    this.logger.log('Starting Snapshot Sync process...');
    const categories = await this.categoryRepository.find();

    if (!categories || categories.length === 0) {
      return;
    }

    try {
      const headers = {
        Referer: this.configService.get<string>('API_REFERER') ?? '',
        Cookie: this.configService.get<string>('API_COOKIE') ?? '',
        'User-Agent': 'Mozilla/5.0 (compatible; WeChoiceTracker/1.0)',
      };

      // Gọi API cho từng category
      for (const category of categories) {
        // [SỬA ĐỔI QUAN TRỌNG]: Đổi lstId thành awardId
        const separator = this.apiUrl.includes('?') ? '&' : '?';
        const apiUrlWithCategory = `${this.apiUrl}${separator}awardId=${category.id}`;
        
        try {
          const response = await firstValueFrom(
            this.http.get(apiUrlWithCategory, {
              headers,
              responseType: 'json',
            }),
          );
          const result = response.data;
          const rawList = result?.Data || result?.data || [];

          for (const item of rawList) {
            // Mapping thông minh tương tự RealtimeService
            const candidateId = item.m || item.id;
            const totalVote = item.list?.[0]?.v ?? item.vote ?? item.totalVotes ?? 0;

            if (!candidateId) continue;

            const candidate = await this.candidateRepository.findOne({
              where: { id: candidateId },
              relations: ['category'],
            });

            if (candidate) {
              const snapshot = this.snapshotRepository.create({
                candidate: candidate,
                category: candidate.category,
                totalVote: totalVote,
              });
              await this.snapshotRepository.save(snapshot);
            }
          }
        } catch (categoryError) {
          this.logger.error(`Failed snapshot for category ${category.id}`);
        }
      }

      // Xóa cache để Frontend nhận dữ liệu mới ngay
      await this.cacheManager.clear();
      this.logger.log('Snapshot sync completed & Cache cleared.');
    } catch (error) {
      this.logger.error('Failed to sync snapshots:', error);
    }
  }

  // Cron job chạy mỗi 10 phút để lưu lịch sử
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    const enableCron = this.configService.get<string>('ENABLE_CRON');
    if (enableCron !== 'true') {
      this.logger.warn('Cron job is disabled.');
      return;
    }
    await this.syncVotes();
  }
}
