using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AuthController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginModel model)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == model.Username);

        if (user == null)
        {
            return Ok(new { success = false });
        }

        if (VerifyPassword(model.Password, user.PasswordHash))
        {
            // Здесь вы можете создать и вернуть токен аутентификации
            return Ok(new { success = true });
        }

        return Ok(new { success = false });
    }

    private bool VerifyPassword(string password, string storedHash)
    {
        using (var sha256 = SHA256.Create())
        {
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            var hash = BitConverter.ToString(hashedBytes).Replace("-", "").ToLower();
            return hash == storedHash;
        }
    }
}

public class LoginModel
{
    public string Username { get; set; }
    public string Password { get; set; }
}
