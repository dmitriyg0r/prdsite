namespace ScheduleApp.DataAccess.Models;
using System.ComponentModel.DataAnnotations;

public class User
{
    public int Id { get; set; }
    
    [Required]
    [StringLength(50, MinimumLength = 3)]
    public string Username { get; set; }
    
    [Required]
    public string PasswordHash { get; set; }
    
    [Required]
    [RegularExpression("^(Admin|User)$")]
    public string Role { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLogin { get; set; }
}
