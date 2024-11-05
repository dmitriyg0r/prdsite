import React, { useState, useEffect } from 'react';

interface User {
    id: number;
    username: string;
    role: string;
    lastLogin: string;
}

const UsersList: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('https://adminflow.ru/api/users', {
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

    const handleDeleteUser = async (id: number) => {
        try {
            const response = await fetch(`https://adminflow.ru/api/users/${id}`, {
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

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="users-list">
            <h2>Users</h2>
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
                            <td>{new Date(user.lastLogin).toLocaleString()}</td>
                            <td>
                                <button 
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="delete-button"
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
