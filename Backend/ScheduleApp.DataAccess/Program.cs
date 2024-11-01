using ScheduleApp.DataAccess.Data;
using ScheduleApp.DataAccess.Models;

namespace ScheduleApp.DataAccess;

class Program
{
    static void Main(string[] args)
    {
        using var db = new ApplicationDbContext();
        db.Database.EnsureCreated();

        while (true)
        {
            Console.WriteLine("\nВыберите действие:");
            Console.WriteLine("1. Показать всех пользователей");
            Console.WriteLine("2. Добавить пользователя");
            Console.WriteLine("3. Изменить пароль");
            Console.WriteLine("4. Удалить пользователя");
            Console.WriteLine("5. Выход");

            var choice = Console.ReadLine();

            switch (choice)
            {
                case "1":
                    ShowUsers(db);
                    break;
                case "2":
                    AddUser(db);
                    break;
                case "3":
                    ChangePassword(db);
                    break;
                case "4":
                    DeleteUser(db);
                    break;
                case "5":
                    return;
                default:
                    Console.WriteLine("Неверный выбор");
                    break;
            }
        }
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

        if (db.Users.Any(u => u.Username == username))
        {
            Console.WriteLine("Пользователь с таким логином уже существует");
            return;
        }

        Console.Write("Введите пароль: ");
        var password = Console.ReadLine();

        Console.Write("Введите роль (Admin/User): ");
        var role = Console.ReadLine();

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
