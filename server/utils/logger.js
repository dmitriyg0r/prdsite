const winston = require('winston');

// Настройка форматов для логов
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Настройка транспортов (где будут храниться логи)
const transports = [
    // Логи в консоль
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }),
    // Логи в файл (ошибки)
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }),
    // Логи в файл (все)
    new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
    })
];

// Создание логгера
const logger = winston.createLogger({
    level: 'info', // Уровень логирования (info, error, warn, debug)
    format: logFormat,
    transports: transports
});

module.exports = logger;