using BCrypt.Net;

namespace ScheduleApp.DataAccess;

public static class PasswordHasher
{
    public static string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11);
    }

    public static bool VerifyPassword(string password, string hash)
    {
        return BCrypt.Net.BCrypt.Verify(password, hash);
    }

    // Если вам нужно сгенерировать хеш для тестирования
    public static void GenerateHashExample()
    {
        string password = "admin";
        string hash = HashPassword(password);
        Console.WriteLine($"Password: {password}");
        Console.WriteLine($"Hash: {hash}");
        
        bool isValid = VerifyPassword(password, hash);
        Console.WriteLine($"Verification: {isValid}");
    }
} 