using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using ScheduleApp.DataAccess.Models;
using ScheduleApp.DataAccess.Data;

namespace ScheduleApp.DataAccess.Controllers
{
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

                if (_context.Database.CanConnect())
                {
                    _logger.LogInformation("Database connection successful");
                }
                else
                {
                    _logger.LogError("Cannot connect to database");
                    return StatusCode(500, new { success = false, message = "Database connection error" });
                }

                if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
                {
                    _logger.LogWarning("Invalid login attempt: Username or password is empty");
                    return BadRequest(new { success = false, message = "Username and password are required" });
                }

                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Username == request.Username);

                if (user == null)
                {
                    _logger.LogWarning("User not found: {Username}", request.Username);
                    return BadRequest(new { success = false, message = "Invalid username or password" });
                }

                _logger.LogInformation("User found, verifying password");

                if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                {
                    _logger.LogWarning("Invalid password for user: {Username}", request.Username);
                    return BadRequest(new { success = false, message = "Invalid username or password" });
                }

                _logger.LogInformation("Password verified, generating token");

                if (string.IsNullOrEmpty(_configuration["Jwt:Key"]))
                {
                    _logger.LogError("JWT Key is not configured");
                    return StatusCode(500, new { success = false, message = "JWT configuration error" });
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
                _logger.LogError(ex, "Error in Login endpoint: {Message}", ex.Message);
                return StatusCode(500, new { success = false, message = "Internal server error", details = ex.Message });
            }
        }

        [HttpPost("anonymous-login")]
        public IActionResult AnonymousLogin()
        {
            try 
            {
                _logger.LogInformation("Anonymous login attempt");
                
                var anonymousUser = new User 
                { 
                    Id = 0,
                    Username = "anonymous",
                    Role = "Anonymous",
                    PasswordHash = "anonymous",
                    CreatedAt = DateTime.UtcNow
                };

                var token = GenerateJwtToken(anonymousUser);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        username = anonymousUser.Username,
                        role = anonymousUser.Role,
                        token = token
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in AnonymousLogin: {Message}", ex.Message);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
} 