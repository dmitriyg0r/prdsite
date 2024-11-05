import type { User, UserResponse, UserDeleteResponse } from '../types/User';

interface Props {
    token?: string;
}

const UsersList: React.FC<Props> = ({ token }) => {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const storedToken = token || localStorage.getItem('token');
                if (!storedToken) {
                    throw new Error('No authentication token found');
                }

                const response = await fetch('/api/users', {
                    headers: {
                        'Authorization': `Bearer ${storedToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const data: UserResponse = await response.json();
                if (data.success) {
                    setUsers(data.data);
                } else {
                    throw new Error(data.message || 'Failed to fetch users');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error fetching users');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [token]);

    const handleDelete = async (id: number) => {
        try {
            const storedToken = token || localStorage.getItem('token');
            if (!storedToken) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${storedToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data: UserDeleteResponse = await response.json();
            if (data.success) {
                setUsers(prevUsers => prevUsers.filter(user => user.id !== id));
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error deleting user');
        }
    };

    if (loading) {
        return <div className="loading">Loading users...</div>;
    }

    return (
        <div className="users-list">
            {users.length === 0 ? (
                <p>No users found</p>
            ) : (
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
                                        aria-label={`Delete user ${user.username}`}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}; 