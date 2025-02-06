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
    baseUrl: 'https://api.tochka.com/openapi/v1',  // Обновленный URL для API
    accountId: process.env.TOCHKA_API_ACCOUNT_ID,
    token: process.env.TOCHKA_API_TOKEN,
    clientId: process.env.TOCHKA_CLIENT_ID
};

// Проверяем только в production режиме
if (process.env.NODE_ENV === 'production' && (!config.accountId || !config.token)) {
    throw new Error('Отсутствуют необходимые переменные окружения для API банка Точка');
}

class TochkaPaymentChecker {
    constructor() {
        this.baseUrl = config.baseUrl;
        this.accountId = config.accountId;
        this.token = config.token;
        this.clientId = config.clientId;
    }

    // Формирование заголовков для запросов
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Client-Id': this.clientId
        };
    }

    // Получение баланса счета
    async getAccountBalance() {
        try {
            const response = await fetch(`${this.baseUrl}/organization/accounts`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                console.error('Ошибка API:', response.status);
                const errorText = await response.text();
                console.error('Ответ API:', errorText);
                throw new Error(`Ошибка API: ${response.status}`);
            }

            const data = await response.json();
            console.log('Ответ API баланса:', data);

            // Находим нужный счет и его баланс
            const account = data.accounts?.[0] || {};
            return {
                balance: account.balance || account.amount || 0,
                currency: account.currency || 'RUB'
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
            const today = new Date();
            const oneDayAgo = new Date(today);
            oneDayAgo.setDate(today.getDate() - 1);

            const response = await fetch(`${this.baseUrl}/organization/statement`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    from: oneDayAgo.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0]
                })
            });

            if (!response.ok) {
                console.error('Ошибка API платежей:', response.status);
                const errorText = await response.text();
                console.error('Ответ API платежей:', errorText);
                throw new Error(`Ошибка API: ${response.status}`);
            }

            const data = await response.json();
            console.log('Ответ API платежей:', data);

            return data.operations || [];
        } catch (error) {
            console.error('Ошибка при получении платежей:', error);
            return [];
        }
    }

    // Метод для проверки доступности API
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/organization/info`, {
                method: 'GET',
                headers: this.getHeaders()
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
console.log('Client ID:', config.clientId);
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