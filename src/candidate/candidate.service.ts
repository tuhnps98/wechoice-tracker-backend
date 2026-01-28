import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candidate } from './candidate.entity';

@Injectable()
export class CandidateService {
  constructor(
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
  ) {}

  async findAll(): Promise<Candidate[]> {
    return this.candidateRepository.find({
      relations: ['category', 'snapshots'], // Load luôn quan hệ để dùng nếu cần
    });
  }

  // 👇 Đổi id: number thành id: string
  async findOne(id: string): Promise<Candidate> {
    const candidate = await this.candidateRepository.findOne({
      where: { id: id }, // ID bây giờ là string
      relations: ['category'],
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }
    return candidate;
  }
  
  // Các hàm create/update nếu có cũng cần đảm bảo nhận string
}
