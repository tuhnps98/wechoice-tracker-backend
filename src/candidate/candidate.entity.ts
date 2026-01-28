import { Entity, Column, ManyToOne, OneToMany, JoinColumn, PrimaryColumn } from 'typeorm';
import { Category } from '../category/category.entity';
import { Snapshot } from '../snapshot/snapshot.entity';

@Entity('candidates')
export class Candidate {
  // 👇 [QUAN TRỌNG] Đổi thành string
  @PrimaryColumn({ type: 'bigint' }) 
  id: string;

  @Column()
  name: string;

  @Column({ name: 'category_id', type: 'bigint', nullable: true })
  categoryId: string; // 👇 Cái này cũng phải là string

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => Snapshot, (snapshot) => snapshot.candidate)
  snapshots: Snapshot[];
}
