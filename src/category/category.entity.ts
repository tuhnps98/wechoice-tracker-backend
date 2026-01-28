import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Candidate } from '../candidate/candidate.entity';

@Entity('categories')
export class Category {
  // 👇 [QUAN TRỌNG] Đổi thành string để chứa được ID siêu to của WeChoice
  @PrimaryColumn({ type: 'bigint' }) 
  id: string; 

  @Column()
  name: string;

  @OneToMany(() => Candidate, (candidate) => candidate.category)
  candidates: Candidate[];
}
