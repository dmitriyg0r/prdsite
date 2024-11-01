using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using ScheduleApp.DataAccess.Models;
using ScheduleApp.DataAccess.Data;
using BCrypt.Net;

namespace ScheduleApp.DataAccess.Controllers;

[ApiController]
[Route("api/auth")]
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
        if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest(new { message = "Логин и пароль обязательны" });
        }
        
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

    [HttpGet("routes")]
    public IActionResult GetRoutes()
    {
        var endpoints = HttpContext.RequestServices
            .GetRequiredService<IEnumerable<EndpointDataSource>>()
            .SelectMany(source => source.Endpoints);
        
        return Ok(endpoints.Select(e => e.DisplayName));
    }
}

public class LoginRequest
{
    public required string Username { get; set; }
    public required string Password { get; set; }
} 