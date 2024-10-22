using Microsoft.EntityFrameworkCore;
using database.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ... остальной код ...

var app = builder.Build();

// ... остальной код ...

app.Run();
