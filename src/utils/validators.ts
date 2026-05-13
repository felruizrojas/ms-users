import { validarDigitoVerificador } from './validarDigitoVerificador';

// Solo letras (incluye tildes y ñ), mínimo 3 caracteres
export const esNombreValido = (valor: string): boolean =>
  /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]{3,}$/.test(valor.trim());

// Al menos un @
export const esEmailValido = (valor: string): boolean =>
  valor.includes('@');

// Solo números, con + opcional al inicio
export const esTelefonoValido = (valor: string): boolean =>
  /^\+?[0-9]+$/.test(valor);

// Normaliza RUN/RUT a formato 11111111-1 y valida
export const normalizarYValidarRut = (valor: string): { valido: boolean; normalizado: string } => {
  const limpio = valor.replace(/[\.\-\s]/g, '').toUpperCase();
  if (limpio.length < 2) return { valido: false, normalizado: '' };

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const normalizado = `${cuerpo}-${dv}`;

  return { valido: validarDigitoVerificador(valor), normalizado };
};
