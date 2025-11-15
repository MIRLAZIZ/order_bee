
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';



  const date = new Date();
  const tashkentTime = new Date(date.getTime() + 5 * 60 * 60 * 1000); // UTC+5

// ✅ Loglar saqlanadigan papka
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);

}

// ✅ Har kuni yangi fayl nomi (masalan: error-2025-10-31.log)

const logFilePath = path.join(logDir, `error.log`);

// ✅ O‘zbekiston vaqti bilan yozish
const timeInTashkent = winston.format((info) => {
  info.timestamp = tashkentTime.toISOString().replace('T', ' ').split('.')[0];
  return info;
});

// ✅ Chiroyli format (readable JSON)
const prettyFormat = winston.format.printf(({ timestamp, level, message, stack }) => {
  return JSON.stringify(
    {
      time: timestamp,
      level,
      message,
      stack: stack || null,
    },
    null,
    2 // JSON ichini chiroyli (indent bilan) yozadi
  );
});

// ✅ Yakuniy konfiguratsiya
export const winstonErrorConfig = {
  level: 'error',
  format: winston.format.combine(
    timeInTashkent(),               // O‘zbekiston vaqti
    winston.format.errors({ stack: true }), // Stack trace qo‘shiladi
    prettyFormat                    // Chiroyli JSON format
  ),
  transports: [
    new winston.transports.File({
      filename: logFilePath,        // Har kuni yangi fayl
      level: 'error',               // Faqat error loglar
    }),
    new winston.transports.Console({
      level: 'error',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
};

