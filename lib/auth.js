export function normalizePhoneNumber(phoneNumber) {
  return phoneNumber.replace(/\D/g, "");
}

export function toE164PhoneNumber(phoneNumber) {
  const digits = normalizePhoneNumber(phoneNumber);
  if (!digits) return "";
  if (digits.startsWith("0")) return `+63${digits.slice(1)}`;
  if (digits.startsWith("63")) return `+${digits}`;
  return `+${digits}`;
}

export function toLocalPhoneNumber(phoneNumber) {
  const digits = normalizePhoneNumber(phoneNumber);
  return digits.startsWith("63") ? `0${digits.slice(2)}` : digits;
}
