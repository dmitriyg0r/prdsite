using Microsoft.EntityFrameworkCore;
using Models;

namespace Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // Добавьте DbSet для ваших моделей здесь
        // public DbSet<YourModel> YourModels { get; set; }
    }
}
