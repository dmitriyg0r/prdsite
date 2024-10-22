using Microsoft.EntityFrameworkCore;

namespace database
{
    public class YourDbContext : DbContext
    {
        public YourDbContext(DbContextOptions<YourDbContext> options)
            : base(options)
        {
        }

        // Определите здесь ваши DbSet<T>
    }
}
