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
    baseUrl: 'https://enter.tochka.com/uapi/open-banking/v1.0',
    accountId: '40802810220000549839',
    bankId: '044525104',
    token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJqVlhHd3I4Z3NxY0FsZTJhd05CUGdVaTJ6c0ZBUDhBbSJ9.Uk-n6PHtKr79GIwEBijZFr4MhG3QK7dmOBKvD8gU68Ip8dAooHm9Xm3_Oa3HfZHBc0z8_CsHiR0XvR_HVPfKiNjgh9mKyUUg0xuEw6lCo0AXnf9nuzkhBjMWTniUvxaCFAMDZFszT2e1AjKq09O4PkVttjgayCJiT5IAiF27C00Mk38hQZo8ybTj8ZVeiCWCB_ba9kz1kYr_EaQ-K4DT1uggGKtoRrpRGJruF__g8OwPknU91xY0O5y57NdfGLD7O64Nvqecf6Vp_Lcf6eHtoEX3F4-1blU-cNJVdf1uIiKQZai2DGhMnuMHVobHCjMPnJ4lY_upKIimKtR5sfek1wTcecxa-hJy5MEG0MpjbS7S43HAIzoB_jOI3ZuyRD9ubGJS-ZcMEUACzyBahbSVIP7A-J0_Z8TgBcDL-FuUvCShzGzneceqRuiKpmQFDznsJEuJGy4DBr0s7e4sLKYEKUZ3syg-hgYtl0WkAo4GArasn6af5baefLgLy0j-ZARI' // Токен напрямую в конфиге
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

    // Получение заголовков для запросов
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    // Получение баланса счета
    async getAccountBalance() {
        try {
            const url = `${this.baseUrl}/accounts/${this.accountId}/${this.bankId}/balances`;
            console.log('Запрос баланса URL:', url);

            const response = await fetch(url, {
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

            // Исправленная обработка ответа API
            const balances = data.Data?.Balance || [];
            const currentBalance = balances.find(b => b.Type === 'Current') || balances[0] || {};
            
            return {
                balance: parseFloat(currentBalance.Amount?.Amount || 0),
                currency: currentBalance.Amount?.Currency || 'RUB'
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
            console.log('Запрос транзакций URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                console.error('Ошибка API платежей:', response.status);
                const errorText = await response.text();
                console.error('Ответ API платежей:', errorText);
                throw new Error(`Ошибка API: ${response.status}`);
            }

            const data = await response.json();
            console.log('Ответ API платежей:', data);

            return data.Data?.Transaction || [];
        } catch (error) {
            console.error('Ошибка при получении платежей:', error);
            return [];
        }
    }

    // Метод для проверки доступности API
    async testConnection() {
        try {
            const url = `${this.baseUrl}/accounts/${this.accountId}/${this.bankId}/balances`;
            console.log('Тестовый запрос URL:', url);
            console.log('Заголовки:', this.getHeaders());

            const response = await fetch(url, {
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
console.log('Bank ID:', config.bankId);
console.log('Token:', config.token ? 'Present' : 'Missing');

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