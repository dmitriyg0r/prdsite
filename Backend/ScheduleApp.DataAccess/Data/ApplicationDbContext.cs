using Microsoft.EntityFrameworkCore;
using ScheduleApp.DataAccess.Models;

namespace ScheduleApp.DataAccess.Data;

public class ApplicationDbContext : DbContext
{
    public DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseSqlite("Data Source=schedule.db");
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Настройка уникальности username
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        // Добавление администратора по умолчанию
        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = 1,
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin"), // Пароль: admin
                Role = "Admin",
                CreatedAt = DateTime.UtcNow
            }
        );
    }
} 