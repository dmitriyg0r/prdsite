using Microsoft.AspNetCore.Mvc;
using ScheduleApp.DataAccess.Models;
using ScheduleApp.DataAccess.Data;

namespace ScheduleApp.DataAccess.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public AuthController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        var user = _db.Users.FirstOrDefault(u => u.Username == request.Username);
        
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Неверный логин или пароль" });
        }

        // Обновляем время последнего входа
        user.LastLogin = DateTime.UtcNow;
        _db.SaveChanges();

        return Ok(new { 
            username = user.Username,
            role = user.Role
        });
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
} 