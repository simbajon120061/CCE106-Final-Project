export function normalizePhoneNumber(phoneNumber) {
  return phoneNumber.replace(/\D/g, "");
}
