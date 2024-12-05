export const API_BASE_URL = 'https://adminflow.ru/api';

export const showError = (message) => {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
};

export const showSuccess = (message) => {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
};

export const togglePassword = (type) => {
    const inputId = type === 'login' ? 'login-password' : 'reg-password';
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

export const apiRequest = async (endpoint, options = {}) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user'))?.username || ''}`,
                ...options.headers
            }
        });

        if (!response.ok) {
            console.error(`API Error (${endpoint}):`, response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`API Request failed (${endpoint}):`, error);
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
                errors[field] = 'Это поле обязательно для зполнения';
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