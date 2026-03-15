/**
 * Validación de contraseña — Studio Iuris
 * Requisitos: mínimo 8 caracteres, al menos 1 mayúscula, al menos 2 números
 */

export interface PasswordCheck {
  valid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasTwoNumbers: boolean;
}

export const PASSWORD_ERROR_MESSAGE =
  "La contraseña debe tener al menos 8 caracteres, una mayúscula y dos números.";

export function validatePassword(password: string): PasswordCheck {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasTwoNumbers = (password.match(/\d/g) || []).length >= 2;

  return {
    valid: hasMinLength && hasUppercase && hasTwoNumbers,
    hasMinLength,
    hasUppercase,
    hasTwoNumbers,
  };
}
