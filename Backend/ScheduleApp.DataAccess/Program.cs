using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ScheduleApp.DataAccess.Data;
using ScheduleApp.DataAccess.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.OpenApi.Models;

namespace ScheduleApp.DataAccess;

class Program
{
    static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        
        // Настройка Swagger
        builder.Services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo { 
                Title = "ScheduleApp API", 
                Version = "v1" 
            });
        });

        // Add CORS
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAll", builder =>
            {
                builder.AllowAnyOrigin()
                       .AllowAnyMethod()
                       .AllowAnyHeader();
            });
        });

        // Add DbContext
        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(
                builder.Configuration.GetConnectionString("DefaultConnection")
            ));

        var app = builder.Build();

        // Применяем миграции при запуске
        try
        {
            using (var scope = app.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var dbContext = services.GetRequiredService<ApplicationDbContext>();
                var dbLogger = services.GetRequiredService<ILogger<Program>>();

                dbLogger.LogInformation("Attempting to migrate database...");
                dbContext.Database.Migrate();
                dbLogger.LogInformation("Database migration completed");
            }
        }
        catch (Exception ex)
        {
            var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();
            startupLogger.LogError(ex, "An error occurred while migrating the database");
        }

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseRouting();
        app.UseCors("AllowAll");

        app.MapControllers();

        // Логируем все зарегистрированные маршруты
        var routeLogger = app.Services.GetRequiredService<ILogger<Program>>();
        var endpoints = app.Services.GetRequiredService<IEnumerable<EndpointDataSource>>()
            .SelectMany(source => source.Endpoints);

        foreach (var endpoint in endpoints)
        {
            routeLogger.LogInformation("Registered endpoint: {Endpoint}", endpoint.DisplayName);
        }

        app.Run();
    }
}
