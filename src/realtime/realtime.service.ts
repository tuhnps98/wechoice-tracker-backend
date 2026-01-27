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

  // Danh sách ID của 11 hạng mục
  private readonly awardIds = [
    '1139940505347850241', // 1. Nhân vật truyền cảm hứng
    '1139348144262578177', // 2. Ca sĩ/Rapper
    '1139348144369926145', // 3. Bài hát
    '1139348144316121089', // 4. Show giải trí
    '1139348144288858113', // 5. Rising Artist
    '1139348144341155841', // 6. Phim điện ảnh
    '1139348144181903361', // 7. Phim truyền hình (Đoán tên)
    '1139348144209428481', // 8. Diễn viên
    '1139348144238723073', // 9. Young Face
    '1139348144394240001', // 10. Young Projects
    '1139348144417701889', // 11. CSR
  ];

  // Token dùng chung (Lấy từ link bạn gửi)
  private readonly sessionToken = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyQWdlbnQiOiJDaHJvbWUiLCJ1c2VySWQiOjIzMTcxNzk5OTc2MTE5OTksImVtYWlsIjoiYWRvcHR3ZWNob2ljZUBnbWFpbC5jb20iLCJpYXQiOjE3Njk0ODc5NDksImV4cCI6MTc3MDA5Mjc0OX0.QHkTYP5_iwPa8NbEW4HhF0Hav7pN_BkMUUfH87YTtpg';

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
  ) {}

  getCachedData() {
    return this.cachedData;
  }

  // Hàm tạo URL
  private getApiUrl(awardId: string): string {
    return `https://voting.net-solutions.vn/wechoice/v2/voting/vote-count?awardId=${awardId}&sessionToken=${this.sessionToken}&save=1`;
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async getVotes() {
    this.logger.log('--- START FETCHING ALL 11 CATEGORIES ---');
    
    // Lấy toàn bộ candidate từ DB để map tên
    const dbCandidates = await this.candidateRepository.find({ relations: ['category'] });
    
    // Tạo Map khóa kép: "awardId_candidateId" -> Candidate Entity
    const candidateMap = new Map<string, Candidate>();
    dbCandidates.forEach(c => {
        candidateMap.set(`${c.categoryId}_${c.id}`, c);
    });

    let allTransformedData: any[] = [];

    // Chạy vòng lặp qua từng hạng mục
    for (const awardId of this.awardIds) {
        try {
            const url = this.getApiUrl(awardId);
            const response = await firstValueFrom(
                this.httpService.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Referer': 'https://wechoice.vn/'
                }
                })
            );
            
            const result = response.data;
            if (!result.status || !result.data || !result.data.countInfo) {
                continue; 
            }

            const voteDataList = result.data.countInfo;

            for (const item of voteDataList) {
                const candidateId = item.finalCandidateId; // ID: 1, 2, 3...
                const totalVotes = item.voteCount || 0;

                // Tìm candidate trong Map bằng khóa kép
                const mapKey = `${awardId}_${candidateId}`;
                const candidate = candidateMap.get(mapKey);

                if (candidate) {
                    allTransformedData.push({
                        id: candidate.id,
                        name: candidate.name, 
                        categoryId: candidate.categoryId,
                        categoryName: candidate.category?.name || 'WeChoice Awards',
                        totalVotes: totalVotes,
                    });
                }
            }
        } catch (error) {
            this.logger.error(`Failed to fetch awardId ${awardId}: ${error.message}`);
        }
    }

    // Cập nhật Cache
    const payload = {
      updatedAt: new Date().toISOString(),
      data: allTransformedData,
    };

    this.cachedData.updatedAt = payload.updatedAt;
    this.cachedData.data = payload.data;
    this.cachedData.status = 'Success';
    
    this.logger.log(`Updated successfully. Total records: ${allTransformedData.length}`);
    return payload;
  }
}
