using BCrypt.Net;

public class Program
{
    public static void Main()
    {
        string password = "admin";
        string hash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11);
        Console.WriteLine($"Password: {password}");
        Console.WriteLine($"Hash: {hash}");
        
        // Проверка
        bool isValid = BCrypt.Net.BCrypt.Verify(password, hash);
        Console.WriteLine($"Verification: {isValid}");
    }
} 