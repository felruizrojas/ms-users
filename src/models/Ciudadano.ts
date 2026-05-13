import {
  Entity, PrimaryGeneratedColumn, Column,
  OneToOne, JoinColumn
} from 'typeorm';
import { User } from './User';

@Entity('ciudadanos')
export class Ciudadano {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, (user) => user.ciudadano)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  primer_nombre!: string;

  @Column({ nullable: true })
  segundo_nombre!: string;

  @Column()
  apellido_paterno!: string;

  @Column({ nullable: true })
  apellido_materno!: string;

  @Column({ unique: true })
  run!: string;

  @Column()
  direccion!: string;
}