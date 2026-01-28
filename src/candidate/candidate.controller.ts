import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { CandidateService } from './candidate.service';

@Controller('candidates')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Get()
  findAll() {
    return this.candidateService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const candidate = await this.candidateService.findOne(id);
    if (!candidate) throw new NotFoundException();
    return candidate;
  }
}
