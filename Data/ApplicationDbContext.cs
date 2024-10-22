using Microsoft.EntityFrameworkCore;
using Models;
using System;
using System.IO;
using System.Configuration;

namespace Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                var basePath = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "database"));
                var configuration = new ConfigurationBuilder()
                    .SetBasePath(basePath)
                    .AddJsonFile("appsettings.json")
                    .Build();

                var connectionString = configuration.GetConnectionString("DefaultConnection");
                optionsBuilder.UseSqlite(connectionString);
            }
        }

        // Добавьте DbSet для ваших моделей здесь
        // public DbSet<YourModel> YourModels { get; set; }
    }
}
