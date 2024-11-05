using Microsoft.EntityFrameworkCore;
using ScheduleApp.DataAccess.Models;
using BCrypt.Net;

namespace ScheduleApp.DataAccess.Data;

public class ApplicationDbContext : DbContext
{
    public DbSet<User> Users { get; set; }

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public async Task InitializeUsers()
    {
        if (!await Users.AnyAsync())
        {
            var users = new List<User>
            {
                new User
                {
                    Username = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin"),
                    Role = "Admin"
                },
                new User
                {
                    Username = "user1",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("user1"),
                    Role = "User"
                },
                new User
                {
                    Username = "user2",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("user2"),
                    Role = "User"
                }
            };

            Users.AddRange(users);
            await SaveChangesAsync();
        }
    }
} 