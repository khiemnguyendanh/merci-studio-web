import { createHash } from 'node:crypto';

export class ValidationError extends Error {
  readonly status = 400;
}

export function cleanString(value: unknown, field: string, maxLength: number, required = false) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) throw new ValidationError(`${field} là bắt buộc.`);
  if (text.length > maxLength) throw new ValidationError(`${field} vượt quá ${maxLength} ký tự.`);
  return text;
}

export function normalizePhone(value: unknown) {
  let phone = cleanString(value, 'Số điện thoại', 30, true).replace(/[^\d+]/g, '');
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  if (phone.startsWith('84') && phone.length >= 11) phone = `0${phone.slice(2)}`;
  if (!/^0\d{8,10}$/.test(phone)) throw new ValidationError('Số điện thoại không hợp lệ.');
  return phone;
}

export function hashValue(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
