import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Candidate } from '../candidate/candidate.entity';

@Entity('vote_snapshots')
export class Snapshot {
  @PrimaryGeneratedColumn()
  id: number; // ID của snapshot thì để số thường được

  @Column({ name: 'candidate_id', type: 'bigint' })
  candidateId: string; // 👇 ID tham chiếu phải là string để khớp với Candidate

  @Column({ name: 'total_votes', type: 'int' })
  totalVotes: number;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;

  @ManyToOne(() => Candidate, (candidate) => candidate.snapshots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;
}
