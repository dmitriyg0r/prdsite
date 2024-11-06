using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;

namespace ScheduleApp.DataAccess.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableCors("AllowAll")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public IActionResult Check()
        {
            return Ok(new { status = "healthy" });
        }
    }
} 