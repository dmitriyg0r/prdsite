using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ScheduleApp.DataAccess.Data;
using ScheduleApp.DataAccess.Models;
using Microsoft.EntityFrameworkCore;

namespace ScheduleApp.DataAccess;

class Program
{
    static void Main(string[] args)
    {
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

        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlite("Data Source=schedule.db"));

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        app.UseCors(builder =>
            builder
                .WithOrigins("https://adminflow.ru")
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials());

        app.Urls.Add("http://0.0.0.0:5000");  // Слушаем все входящие подключения
        // или
        app.Urls.Add("http://adminflow.ru:5000");  // Слушаем конкретный домен

        app.UseRouting();
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

        using (var scope = app.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            context.Database.EnsureCreated();
        }

        app.Run();
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
