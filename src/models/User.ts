import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  OneToOne
} from 'typeorm';
import { Ciudadano } from './Ciudadano';
import { Institucion } from './Institucion';

export enum RolUsuario {
  CIUDADANO = 'ciudadano',
  VETERINARIA = 'veterinaria',
  MUNICIPALIDAD = 'municipalidad',
  MODERADOR = 'moderador',
  ADMINISTRADOR = 'administrador',
  SUPERADMIN = 'superadmin',
}

export enum TipoUsuario {
  CIUDADANO = 'ciudadano',
  INSTITUCION = 'institucion',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  credential_id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  telefono!: string;

  @Column({ nullable: true })
  foto_perfil!: string;

  @Column({ type: 'enum', enum: RolUsuario, default: RolUsuario.CIUDADANO })
  rol!: RolUsuario;

  @Column({ type: 'enum', enum: TipoUsuario })
  tipo!: TipoUsuario;

  @Column()
  region!: string;

  @Column()
  comuna!: string;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne(() => Ciudadano, (ciudadano) => ciudadano.user)
  ciudadano!: Ciudadano;

  @OneToOne(() => Institucion, (institucion) => institucion.user)
  institucion!: Institucion;
}