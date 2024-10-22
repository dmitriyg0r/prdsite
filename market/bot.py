from flask import Flask, request, jsonify
import requests
from flask_cors import CORS  # Добавьте этот импорт

app = Flask(__name__)
CORS(app)  # Добавьте эту строку для разрешения CORS

@app.route('/send-order', methods=['POST'])
def send_order():
    order_data = request.get_json()

    telegram_bot_token = '8195841109:AAFNo-T4NKWsoIHSc85gVW0oVAMHM4x3Z4A'
    chat_id = '413262381'
    message = f"New Order:\nProduct: {order_data['product']}\nSubject: {order_data['subject']}\nDescription: {order_data['description']}\nDate: {order_data['date']}"

    url = f"https://api.telegram.org/bot{telegram_bot_token}/sendMessage"
    data = {
        'chat_id': chat_id,
        'text': message
    }

    response = requests.post(url, json=data)

    if response.status_code == 200:
        return jsonify({'success': True}), 200
    else:
        return jsonify({'success': False}), response.status_code

if __name__ == '__main__':
    app.run(debug=True)
