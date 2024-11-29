CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'User',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание первого админа
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2b$10$yourhashedpassword', 'Admin')
ON CONFLICT (username) DO NOTHING; 