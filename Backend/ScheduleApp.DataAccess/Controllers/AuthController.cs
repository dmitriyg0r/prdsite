using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using ScheduleApp.DataAccess.Models;
using ScheduleApp.DataAccess.Data;
using BCrypt.Net;
using Microsoft.Extensions.Logging;

namespace ScheduleApp.DataAccess.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<AuthController> _logger;

    public AuthController(ApplicationDbContext db, ILogger<AuthController> logger)
    {
        _db = db;
        _logger = logger;
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

    [HttpPost("anonymous-login")]
    public IActionResult AnonymousLogin()
    {
        _logger.LogInformation("Anonymous login endpoint hit at {Time}", DateTime.Now);
        try 
        {
            var response = new { 
                username = "anonymous",
                role = "Anonymous"
            };
            _logger.LogInformation("Returning response: {Response}", 
                System.Text.Json.JsonSerializer.Serialize(response));
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in AnonymousLogin");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok(new { message = "API is working" });
    }
}

public class LoginRequest
{
    public required string Username { get; set; }
    public required string Password { get; set; }
} 