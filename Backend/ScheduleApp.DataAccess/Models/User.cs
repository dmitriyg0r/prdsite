public class User
{
    public int Id { get; set; }
    public string Username { get; set; }
    public string PasswordHash { get; set; }
    public string Role { get; set; } // Admin или User
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLogin { get; set; }
} 