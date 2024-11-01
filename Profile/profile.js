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
