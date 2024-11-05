using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using ScheduleApp.DataAccess.Models;
using ScheduleApp.DataAccess.Data;
using BCrypt.Net;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Cors;

namespace ScheduleApp.DataAccess.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableCors("AllowAll")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;

    public AuthController(ApplicationDbContext db, ILogger<AuthController> logger, IConfiguration configuration)
    {
        _db = db;
        _logger = logger;
        _configuration = configuration;
    }

    private string GenerateJwtToken(User user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("UserId", user.Id.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "your-default-key-here-min-16-chars"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddDays(1),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
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

        // Генерируем JWT токен
        var token = GenerateJwtToken(user);

        // Обновляем время последнего входа
        user.LastLogin = DateTime.UtcNow;
        _db.SaveChanges();

        return Ok(new { 
            username = user.Username,
            role = user.Role,
            token = token
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
        try 
        {
            _logger.LogInformation("Anonymous login attempt");
            
            // Добавляем CORS заголовки явно
            Response.Headers.Add("Access-Control-Allow-Origin", "*");
            Response.Headers.Add("Access-Control-Allow-Methods", "POST, OPTIONS");
            Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
            
            var response = new { 
                username = "anonymous",
                role = "Anonymous"
            };
            
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

    [HttpOptions]
    [Route("{*url}")]
    public IActionResult HandleOptions()
    {
        Response.Headers.Add("Access-Control-Allow-Origin", "*");
        Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization");
        Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        return Ok();
    }
}

public class LoginRequest
{
    public required string Username { get; set; }
    public required string Password { get; set; }
} 