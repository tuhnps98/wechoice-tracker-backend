import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Candidate } from '../candidate/candidate.entity';

@Entity('categories')
export class Category {
  // 👇 Khai báo đúng kiểu dữ liệu khớp với bảng hiện có trong Supabase
  @PrimaryColumn({ type: 'bigint' }) 
  id: number;

  @Column()
  name: string;

  // Mối quan hệ: Một hạng mục có nhiều ứng viên
  @OneToMany(() => Candidate, (candidate) => candidate.category)
  candidates: Candidate[];
}
