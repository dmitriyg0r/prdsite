const togglePassword = () => {
    const passwordInput = document.querySelector('.password-input');
    const eyeIcon = document.querySelector('.eye-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.add('show');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('show');
    }
}

const showError = (message) => {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
};

// Делаем функцию глобальной через window
window.handleAnonymousLogin = async function() {
    try {
        const response = await fetch('/api/auth/anonymous-login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('user', JSON.stringify(data));
            window.location.href = '/index.html';
        } else {
            const error = await response.json();
            showError(error.message || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Error details:', error);
        showError('Ошибка сервера. Попробуйте позже.');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('user', JSON.stringify(data));
            window.location.href = '/index.html';
        } else {
            const error = await response.json();
            showError(error.message || 'Ошибка входа');
        }
    } catch (error) {
        showError('Ошибка сервера. Попробуйте позже.');
    }
}

// Add event listeners when the document loads
document.addEventListener('DOMContentLoaded', () => {
    // Bind regular login form submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Bind anonymous login button
    const anonymousLoginBtn = document.getElementById('anonymous-login-btn');
    if (anonymousLoginBtn) {
        anonymousLoginBtn.addEventListener('click', handleAnonymousLogin);
    }
}); 