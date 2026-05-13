// Valida el dígito verificador de RUN (personas) y RUT (instituciones)
// Algoritmo módulo 11 estándar chileno
export const validarDigitoVerificador = (valor: string): boolean => {
  // Limpiar puntos, guiones y espacios
  const limpio = valor.replace(/[\.\-\s]/g, '').toUpperCase();

  if (limpio.length < 2) return false;

  const cuerpo = limpio.slice(0, -1);
  const digitoIngresado = limpio.slice(-1);

  // Verificar que el cuerpo sea numérico
  if (!/^\d+$/.test(cuerpo)) return false;

  // Calcular dígito verificador
  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = suma % 11;
  const digitoCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : String(11 - resto);

  return digitoIngresado === digitoCalculado;
};