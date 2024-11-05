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

async function handleAnonymousLogin() {
    try {
        const response = await fetch('http://adminflow.ru:5001/api/auth/anonymous-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
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
        console.error('Error:', error);
        showError('Ошибка сервера. Попробуйте позже.');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    console.log('Login form submitted');
    
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

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');

    const loginForm = document.getElementById('login-form');
    const anonymousLoginBtn = document.getElementById('anonymous-login-btn');

    console.log('Login form:', loginForm);
    console.log('Anonymous button:', anonymousLoginBtn);

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Login form handler attached');
    }

    if (anonymousLoginBtn) {
        anonymousLoginBtn.addEventListener('click', handleAnonymousLogin);
        console.log('Anonymous login handler attached');
    }
});
