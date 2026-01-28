import { Controller } from '@nestjs/common';
import { SnapshotService } from './snapshot.service';

@Controller('snapshots')
export class SnapshotController {
  constructor(private readonly snapshotService: SnapshotService) {}
  
  // Hiện tại chưa cần API nào cho snapshot cả
  // Bot sẽ tự chạy ngầm.
}
