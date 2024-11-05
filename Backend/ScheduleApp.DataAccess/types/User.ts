export interface User {
    id: number;
    username: string;
    passwordHash: string;
    role: string;
    createdAt: string;
    lastLogin?: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    username: string;
    role: string;
    token: string;
} 