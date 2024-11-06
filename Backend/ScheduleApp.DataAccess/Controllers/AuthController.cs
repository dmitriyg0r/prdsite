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
[Route("auth")]
[EnableCors("AllowAll")]
public class AuthController : ControllerBase
{
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;

    public AuthController(ILogger<AuthController> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    [HttpPost("anonymous-login")]
    public IActionResult AnonymousLogin()
    {
        try 
        {
            _logger.LogInformation("Anonymous login attempt started");
            
            // Создаем анонимного пользователя
            var anonymousUser = new User 
            { 
                Id = 0,
                Username = "anonymous",
                Role = "Anonymous",
                PasswordHash = "anonymous",
                CreatedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Created anonymous user object");

            // Генерируем JWT токен
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? 
                throw new InvalidOperationException("JWT Key is not configured"));
            
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Name, anonymousUser.Username),
                    new Claim(ClaimTypes.Role, anonymousUser.Role),
                    new Claim("UserId", anonymousUser.Id.ToString())
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature),
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"]
            };

            _logger.LogInformation("Created token descriptor");

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            _logger.LogInformation("Generated JWT token");

            var response = new 
            { 
                success = true,
                data = new 
                {
                    username = anonymousUser.Username,
                    role = anonymousUser.Role,
                    token = tokenString
                }
            };

            _logger.LogInformation("Returning successful response");
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in AnonymousLogin: {Message}", ex.Message);
            return StatusCode(500, new { 
                success = false, 
                message = "Internal server error", 
                details = ex.Message 
            });
        }
    }

    // Тестовый метод
    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok(new { message = "Auth controller is working" });
    }
}

public class LoginRequest
{
    public required string Username { get; set; }
    public required string Password { get; set; }
} 