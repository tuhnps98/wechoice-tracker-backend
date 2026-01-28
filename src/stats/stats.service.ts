import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../category/category.entity';
import { Candidate } from '../candidate/candidate.entity';
import { Snapshot } from '../snapshot/snapshot.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(Snapshot)
    private snapshotRepository: Repository<Snapshot>,
  ) {}

  async getDashboardStats() {
    const totalCategories = await this.categoryRepository.count();
    const totalCandidates = await this.candidateRepository.count();
    
    // Tính tổng vote an toàn
    const { totalVotes } = await this.candidateRepository
      .createQueryBuilder('candidate')
      .select('SUM(candidate.totalVotes)', 'totalVotes') // Lưu ý: Cần chắc chắn Candidate có cột totalVotes hoặc join bảng snapshot
      .getRawOne();

    return {
      totalCategories,
      totalCandidates,
      totalVotes: parseInt(totalVotes || '0'),
    };
  }

  // 👇 Sửa id thành string
  async getCategoryStats(categoryId: string) {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['candidates'],
    });

    if (!category) return null;

    return {
      id: category.id,
      name: category.name,
      candidatesCount: category.candidates?.length || 0,
    };
  }
}
