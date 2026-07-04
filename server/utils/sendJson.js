export function sendJson(res, statusCode, data) {
  res.status(statusCode).json(data);
}