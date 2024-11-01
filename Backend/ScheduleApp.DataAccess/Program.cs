using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ScheduleApp.DataAccess.Data;
using ScheduleApp.DataAccess.Models;

namespace ScheduleApp.DataAccess;

class Program
{
    static void Main(string[] args)
    {
        using var db = new ApplicationDbContext();
        db.Database.EnsureCreated();

        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAll",
                builder =>
                {
                    builder
                        .AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader();
                });
        });

        builder.Services.AddLogging(logging =>
        {
            logging.AddConsole();
            logging.AddDebug();
        });

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        app.UseStaticFiles();
        app.UseDefaultFiles();

        app.UseCors("AllowAll");
        app.UseHttpsRedirection();
        app.UseAuthorization();
        app.MapControllers();

        if (app.Environment.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }
        else
        {
            app.UseExceptionHandler("/Error");
            app.UseHsts();
        }
        app.Run();
    }

    static void ShowUsers(ApplicationDbContext db)
    {
        var users = db.Users.ToList();
        Console.WriteLine("\nСписок пользователей:");
        foreach (var user in users)
        {
            Console.WriteLine($"ID: {user.Id}, Логин: {user.Username}, Роль: {user.Role}");
        }
    }

    static void AddUser(ApplicationDbContext db)
    {
        Console.Write("Введите логин: ");
        var username = Console.ReadLine();

        if (string.IsNullOrEmpty(username))
        {
            Console.WriteLine("Логин не может быть пустым");
            return;
        }

        if (db.Users.Any(u => u.Username == username))
        {
            Console.WriteLine("Пользователь с таким логином уже существует");
            return;
        }

        Console.Write("Введите пароль: ");
        var password = Console.ReadLine();

        if (string.IsNullOrEmpty(password))
        {
            Console.WriteLine("Пароль не может быть пустым");
            return;
        }

        Console.Write("Введите роль (Admin/User): ");
        var role = Console.ReadLine();

        if (role != "Admin" && role != "User")
        {
            Console.WriteLine("Роль должна быть Admin или User");
            return;
        }

        var user = new User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = role,
            CreatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        db.SaveChanges();
        Console.WriteLine("Пользователь успешно добавлен");
    }

    static void ChangePassword(ApplicationDbContext db)
    {
        Console.Write("Введите логин пользователя: ");
        var username = Console.ReadLine();

        var user = db.Users.FirstOrDefault(u => u.Username == username);
        if (user == null)
        {
            Console.WriteLine("Пользователь не найден");
            return;
        }

        Console.Write("Введите новый пароль: ");
        var newPassword = Console.ReadLine();

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        db.SaveChanges();
        Console.WriteLine("Пароль успешно изменен");
    }

    static void DeleteUser(ApplicationDbContext db)
    {
        Console.Write("Введите логин пользователя для удаления: ");
        var username = Console.ReadLine();

        var user = db.Users.FirstOrDefault(u => u.Username == username);
        if (user == null)
        {
            Console.WriteLine("Пользователь не найден");
            return;
        }

        if (user.Role == "Admin" && db.Users.Count(u => u.Role == "Admin") == 1)
        {
            Console.WriteLine("Нельзя удалить последнего администратора");
            return;
        }

        db.Users.Remove(user);
        db.SaveChanges();
        Console.WriteLine("Пользователь успешно удален");
    }
}
