export const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export function requireText(value, field, maxLength) {
  if (typeof value !== "string") throw httpError(400, "INVALID_INPUT", `${field} is required.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw httpError(400, "INVALID_INPUT", `${field} must be between 1 and ${maxLength} characters.`);
  }
  return normalized;
}
