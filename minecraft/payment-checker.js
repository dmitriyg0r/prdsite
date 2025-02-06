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
    baseUrl: process.env.TOCHKA_API_BASE_URL || 'https://enter.tochka.com/api/v1',
    accountId: process.env.TOCHKA_API_ACCOUNT_ID,
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
        this.token = config.token;
    }

    // Получение баланса счета
    async getAccountBalance() {
        try {
            const response = await fetch(`${this.baseUrl}/account/${this.accountId}/balance`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Ошибка API:', response.status);
                throw new Error(`Ошибка API: ${response.status}`);
            }

            const data = await response.json();
            console.log('Ответ API баланса:', data); // Отладочный вывод

            return {
                balance: data.balance || data.amount || 0,
                currency: data.currency || 'RUB'
            };
        } catch (error) {
            console.error('Ошибка при получении баланса:', error);
            // В случае ошибки возвращаем нулевой баланс
            return {
                balance: 0,
                currency: 'RUB'
            };
        }
    }

    // Получение списка платежей за последние 24 часа
    async getRecentPayments() {
        try {
            const oneDayAgo = new Date();
            oneDayAgo.setHours(oneDayAgo.getHours() - 24);
            
            const response = await fetch(`${this.baseUrl}/statement`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    account_id: this.accountId,
                    from: oneDayAgo.toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                })
            });

            if (!response.ok) {
                console.error('Ошибка API платежей:', response.status);
                throw new Error(`Ошибка API: ${response.status}`);
            }

            const data = await response.json();
            console.log('Ответ API платежей:', data); // Отладочный вывод

            return data.operations || [];
        } catch (error) {
            console.error('Ошибка при получении платежей:', error);
            return [];
        }
    }

    // Метод для проверки доступности API
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/account/${this.accountId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Тест подключения:', response.status); // Отладочный вывод
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

// Пример использования:

const paymentChecker = new TochkaPaymentChecker();

// Проверка платежа
paymentChecker.checkPayment(1000, 'playerName')
    .then(result => {
        if (result.found) {
            console.log('Платеж найден:', result.paymentDetails);
        } else {
            console.log('Платеж не найден');
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
    });

// Получение баланса
paymentChecker.getAccountBalance()
    .then(balance => {
        console.log('Текущий баланс:', balance);
    })
    .catch(error => {
        console.error('Ошибка при получении баланса:', error);
    });


export default TochkaPaymentChecker; 