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
    // 1. Tổng số hạng mục
    const totalCategories = await this.categoryRepository.count();

    // 2. Tổng số đề cử
    const totalCandidates = await this.candidateRepository.count();

    // 3. Tổng lượng vote (cộng dồn từ các ứng viên)
    // Lưu ý: Dùng SUM trên cột total_votes của bảng candidates (nếu có lưu cache) 
    // Hoặc lấy snapshot mới nhất. Ở đây lấy đơn giản từ candidates để demo:
    const { totalVotes } = await this.candidateRepository
      .createQueryBuilder('candidate')
      .select('SUM(candidate.totalVotes)', 'totalVotes') // Giả sử bạn có cột totalVotes trong Candidate (nếu không thì bỏ qua)
      .getRawOne();

    return {
      totalCategories,
      totalCandidates,
      totalVotes: parseInt(totalVotes || '0'),
    };
  }

  // 👇 Đổi id thành string
  async getCategoryStats(categoryId: string) {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['candidates'],
    });

    if (!category) return null;

    // Sắp xếp ứng viên theo vote giảm dần
    // Lưu ý: Đảm bảo Candidate entity của bạn có trường để sort (ví dụ snapshot mới nhất)
    // Đây là ví dụ cơ bản:
    return {
      id: category.id,
      name: category.name,
      candidatesCount: category.candidates.length,
    };
  }
}
