import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Получаем путь к текущей директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env файл
dotenv.config({ path: join(__dirname, '..', '.env') });

// Проверяем наличие переменных окружения и используем значения по умолчанию для разработки
const config = {
    baseUrl: 'https://enter.tochka.com/uapi/open-banking/v1.0',  // Обновленный URL
    accountId: '40817810802000000008', // Номер счета
    bankId: '044525104', // БИК банка
    token: process.env.TOCHKA_API_TOKEN
};

// Проверяем только в production режиме
if (process.env.NODE_ENV === 'production' && (!config.accountId || !config.token)) {
    throw new Error('Отсутствуют необходимые переменные окружения для API банка Точка');
}

class TochkaPaymentChecker {
    constructor() {
        this.baseUrl = config.baseUrl;
        this.accountId = config.accountId;
        this.bankId = config.bankId;
        this.token = config.token;
    }

    // Получение баланса счета
    async getAccountBalance() {
        try {
            // Формируем URL в соответствии с документацией
            const url = `${this.baseUrl}/accounts/${this.accountId}/${this.bankId}/balances`;
            console.log('Запрос баланса URL:', url); // Отладка

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Ошибка API:', response.status);
                const errorText = await response.text();
                console.error('Ответ API:', errorText);
                throw new Error(`Ошибка API: ${response.status}`);
            }

            const data = await response.json();
            console.log('Ответ API баланса:', data);

            // Обработка ответа API
            const balanceInfo = data.Data?.Balance?.[0] || {};
            return {
                balance: balanceInfo.Amount?.Amount || 0,
                currency: balanceInfo.Amount?.Currency || 'RUB'
            };
        } catch (error) {
            console.error('Ошибка при получении баланса:', error);
            return {
                balance: 0,
                currency: 'RUB'
            };
        }
    }

    // Получение списка платежей
    async getRecentPayments() {
        try {
            const url = `${this.baseUrl}/accounts/${this.accountId}/${this.bankId}/transactions`;
            console.log('Запрос транзакций URL:', url); // Отладка

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Ошибка API платежей:', response.status);
                const errorText = await response.text();
                console.error('Ответ API платежей:', errorText);
                throw new Error(`Ошибка API: ${response.status}`);
            }

            const data = await response.json();
            console.log('Ответ API платежей:', data);

            // Обработка ответа API
            return data.Data?.Transaction || [];
        } catch (error) {
            console.error('Ошибка при получении платежей:', error);
            return [];
        }
    }

    // Метод для проверки доступности API
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/accounts`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ответ при тесте подключения:', errorText);
            }
            
            console.log('Тест подключения:', response.status);
            return response.ok;
        } catch (error) {
            console.error('Ошибка при проверке подключения к API:', error);
            return false;
        }
    }

    // Проверка конкретного платежа
    async checkPayment(amount, minecraftLogin) {
        try {
            const payments = await this.getRecentPayments();
            
            // Ищем платеж с соответствующей суммой и логином в описании
            const payment = payments.find(p => {
                return p.amount === amount && 
                       p.description.toLowerCase().includes(minecraftLogin.toLowerCase());
            });

            return {
                found: payment !== undefined,
                paymentDetails: payment || null
            };
        } catch (error) {
            console.error('Ошибка при проверке платежа:', error);
            throw error;
        }
    }

    // Подписка на вебхуки для уведомлений о новых платежах
    async subscribeToWebhooks(webhookUrl) {
        try {
            const response = await fetch(`${this.baseUrl}/webhook/subscribe`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: webhookUrl,
                    events: ['payment.incoming']
                })
            });

            if (!response.ok) {
                throw new Error(`Ошибка при подписке на вебхуки: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка при подписке на вебхуки:', error);
            throw error;
        }
    }
}

// Тестовый код для отладки
const checker = new TochkaPaymentChecker();

console.log('Конфигурация API:');
console.log('Base URL:', config.baseUrl);
console.log('Account ID:', config.accountId);
console.log('Bank ID:', config.bankId);
console.log('Token present:', !!config.token);

checker.testConnection().then(isConnected => {
    console.log('Подключение к API:', isConnected ? 'успешно' : 'ошибка');
    if (isConnected) {
        return checker.getAccountBalance();
    }
}).then(balance => {
    if (balance) {
        console.log('Текущий баланс:', balance);
    }
});

export default TochkaPaymentChecker; 