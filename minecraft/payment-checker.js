// Проверяем наличие необходимых переменных окружения
if (!process.env.TOCHKA_API_TOKEN || !process.env.TOCHKA_API_ACCOUNT_ID) {
    throw new Error('Отсутствуют необходимые переменные окружения для API банка Точка');
}

class TochkaPaymentChecker {
    constructor() {
        this.baseUrl = process.env.TOCHKA_API_BASE_URL;
        this.accountId = process.env.TOCHKA_API_ACCOUNT_ID;
        this.token = process.env.TOCHKA_API_TOKEN;
    }

    // Получение списка платежей за последние 24 часа
    async getRecentPayments() {
        try {
            const oneDayAgo = new Date();
            oneDayAgo.setHours(oneDayAgo.getHours() - 24);
            
            const response = await fetch(`${this.baseUrl}/payments?account_id=${this.accountId}&date_from=${oneDayAgo.toISOString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Ошибка API: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка при получении платежей:', error);
            throw error;
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

    // Получение баланса счета
    async getAccountBalance() {
        try {
            const response = await fetch(`${this.baseUrl}/accounts/${this.accountId}/balance`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Ошибка API: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка при получении баланса:', error);
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