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
using Microsoft.EntityFrameworkCore;

namespace ScheduleApp.DataAccess.Controllers;

[ApiController]
[Route("auth")]
[EnableCors("AllowAll")]
public class AuthController : ControllerBase
{
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;

    public AuthController(
        ILogger<AuthController> logger,
        IConfiguration configuration,
        ApplicationDbContext context)
    {
        _logger = logger;
        _configuration = configuration;
        _context = context;
    }

    private string GenerateJwtToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? 
            throw new InvalidOperationException("JWT Key is not configured"));

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("UserId", user.Id.ToString())
            }),
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature),
            Issuer = _configuration["Jwt:Issuer"],
            Audience = _configuration["Jwt:Audience"]
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            _logger.LogInformation("Login attempt for user: {Username}", request.Username);

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null)
            {
                _logger.LogWarning("User not found: {Username}", request.Username);
                return BadRequest(new { success = false, message = "Invalid username or password" });
            }

            // Проверка пароля
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                _logger.LogWarning("Invalid password for user: {Username}", request.Username);
                return BadRequest(new { success = false, message = "Invalid username or password" });
            }

            var token = GenerateJwtToken(user);

            _logger.LogInformation("User logged in successfully: {Username}", request.Username);

            return Ok(new
            {
                success = true,
                data = new
                {
                    username = user.Username,
                    role = user.Role,
                    token = token
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Login endpoint");
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
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
    public string Username { get; set; }
    public string Password { get; set; }
} 