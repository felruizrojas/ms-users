import {
  Entity, PrimaryGeneratedColumn, Column,
  OneToOne, JoinColumn
} from 'typeorm';
import { User } from './User';

export enum TipoInstitucion {
  MUNICIPALIDAD = 'municipalidad',
  VETERINARIA = 'veterinaria',
}

@Entity('instituciones')
export class Institucion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, (user) => user.institucion)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  nombre_institucion!: string;

  @Column()
  razon_social!: string;

  @Column({ unique: true })
  rut!: string;

  @Column({ type: 'enum', enum: TipoInstitucion })
  tipo_institucion!: TipoInstitucion;

  @Column()
  direccion!: string;
}