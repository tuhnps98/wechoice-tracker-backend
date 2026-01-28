import { Controller, Get, Param } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.statsService.getDashboardStats();
  }

  @Get('category/:id')
  getCategoryStats(@Param('id') id: string) {
    return this.statsService.getCategoryStats(id);
  }
}
