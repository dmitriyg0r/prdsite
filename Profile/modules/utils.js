export const API_BASE_URL = 'https://adminflow.ru/api';

export const showError = (message) => {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.style.backgroundColor = '#ff4444';
        
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
};

export const showSuccess = (message) => {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.style.backgroundColor = '#4CAF50';
        
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
};

export const togglePassword = (formType) => {
    const passwordInput = formType === 'login' 
        ? document.getElementById('login-password')
        : document.getElementById('reg-password');
    const eyeIcon = passwordInput.nextElementSibling;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.add('show');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('show');
    }
};

export const apiRequest = async (endpoint, options = {}) => {
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        const headers = {
            'Accept': 'application/json',
            ...options.headers
        };

        if (userData?.data?.username) {
            headers['Authorization'] = `Bearer ${userData.data.username}`;
        }

        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Произошла ошибка при выполнении запроса');
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
};

export const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const validateForm = (formData, rules) => {
    const errors = {};
    
    for (const [field, value] of Object.entries(formData)) {
        if (rules[field]) {
            if (rules[field].required && !value) {
                errors[field] = 'Это поле обязательно для заполнения';
            }
            if (rules[field].minLength && value.length < rules[field].minLength) {
                errors[field] = `Минимальная длина ${rules[field].minLength} символов`;
            }
            if (rules[field].pattern && !rules[field].pattern.test(value)) {
                errors[field] = rules[field].message || 'Неверный формат';
            }
        }
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

export const handleFileUpload = (file, options = {}) => {
    const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/gif'] } = options;
    
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Файл не выбран'));
            return;
        }

        if (!allowedTypes.includes(file.type)) {
            reject(new Error('Неподдерживаемый тип файла'));
            return;
        }

        if (file.size > maxSize) {
            reject(new Error(`Размер файла не должен превышать ${maxSize / 1024 / 1024}MB`));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Ошибка чтения файла'));
        reader.readAsDataURL(file);
    });
};

export default {
    API_BASE_URL,
    showError,
    showSuccess,
    togglePassword,
    apiRequest,
    formatDate,
    debounce,
    validateForm,
    handleFileUpload
}; 