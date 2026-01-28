import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Category } from '../category/category.entity';

@Entity('candidates')
export class Candidate {
  // 👇 Đổi từ @PrimaryGeneratedColumn sang @PrimaryColumn
  // Để cho phép lưu ID số lớn từ WeChoice (không tự tăng 1,2,3 nữa)
  @PrimaryColumn({ type: 'bigint' }) 
  id: number;

  @Column()
  name: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
