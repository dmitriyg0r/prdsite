import React, { useState, useEffect } from 'react';

// Определяем интерфейс для пользователя
interface User {
    id: number;
    username: string;
    role: string;
    lastLogin?: string;
    email?: string;
}

const UsersList: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('https://adminflow.ru:5002/api/users', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch users');
                }
                
                const data = await response.json();
                setUsers(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error fetching users');
            }
        };

        fetchUsers();
    }, []);

    const handleDelete = async (id: number) => {
        try {
            const response = await fetch(`https://adminflow.ru:5002/api/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete user');
            }

            setUsers(users.filter(user => user.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error deleting user');
        }
    };

    return (
        <div className="users-list">
            {error ? <p className="error">{error}</p> : null}
            <table>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.username}</td>
                            <td>{user.role}</td>
                            <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td>
                            <td>
                                <button 
                                    className="delete-button"
                                    onClick={() => handleDelete(user.id)}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UsersList; 