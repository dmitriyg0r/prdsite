using Microsoft.EntityFrameworkCore;

namespace database
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // Определите здесь ваши DbSet<T>
    }
}
