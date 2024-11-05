export interface User {
    id: number;
    username: string;
    role: string;
    lastLogin?: string;
    email?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserResponse {
    success: boolean;
    data: User[];
    message?: string;
}

export interface UserDeleteResponse {
    success: boolean;
    message: string;
}

export type UserRole = 'Admin' | 'User' | 'Guest';