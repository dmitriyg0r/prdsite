using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using Microsoft.Extensions.Logging;

namespace ScheduleApp.DataAccess.Controllers
{
    [ApiController]
    [Route("health")]
    [EnableCors("AllowAll")]
    public class HealthController : ControllerBase
    {
        private readonly ILogger<HealthController> _logger;

        public HealthController(ILogger<HealthController> logger)
        {
            _logger = logger;
        }

        [HttpGet]
        public IActionResult Check()
        {
            _logger.LogInformation("Health check requested");
            return Ok(new { status = "healthy" });
        }
    }
} 