import { Entity, Column, ManyToOne, OneToMany, JoinColumn, PrimaryColumn } from 'typeorm';
import { Category } from '../category/category.entity';
import { Snapshot } from '../snapshot/snapshot.entity';

@Entity('candidates')
export class Candidate {
  @PrimaryColumn({ type: 'bigint' })
  id: string; // 👈 Quan trọng: String

  @Column()
  name: string;

  @Column({ name: 'category_id', type: 'bigint', nullable: true })
  categoryId: string; // 👈 Quan trọng: String

  @ManyToOne(() => Category, (category) => category.candidates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => Snapshot, (snapshot) => snapshot.candidate)
  snapshots: Snapshot[];
}
