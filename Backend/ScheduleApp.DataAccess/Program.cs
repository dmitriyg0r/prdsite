using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ScheduleApp.DataAccess.Data;
using ScheduleApp.DataAccess.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ScheduleApp.DataAccess;

class Program
{
    static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAll", builder =>
            {
                builder
                    .WithOrigins(
                        "https://adminflow.ru",
                        "http://adminflow.ru",
                        "https://www.adminflow.ru",
                        "http://www.adminflow.ru"
                    )
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();
            });
        });

        builder.Services.AddLogging(logging =>
        {
            logging.AddConsole();
            logging.AddDebug();
            logging.SetMinimumLevel(LogLevel.Debug);
        });

        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlite("Data Source=schedule.db"));

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        app.Use(async (context, next) =>
        {
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogInformation(
                "Request {Method} {Path} started at {Time}",
                context.Request.Method,
                context.Request.Path,
                DateTime.Now);
            
            await next();
            
            logger.LogInformation(
                "Request {Method} {Path} completed with status {Status}",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode);
        });

        app.UseCors("AllowAll");

        app.Urls.Clear();
        app.Urls.Add("http://127.0.0.1:5002");

        app.UseRouting();
        app.UseHttpsRedirection();
        app.UseAuthorization();
        app.MapControllers();

        var logger = app.Services.GetRequiredService<ILogger<Program>>();
        var endpoints = app.Services.GetRequiredService<IEnumerable<EndpointDataSource>>()
            .SelectMany(source => source.Endpoints);
        foreach (var endpoint in endpoints)
        {
            logger.LogInformation("Registered endpoint: {Endpoint}", endpoint.DisplayName);
        }

        if (app.Environment.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }
        else
        {
            app.UseExceptionHandler("/Error");
            app.UseHsts();
        }

        using (var scope = app.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            context.Database.EnsureCreated();
        }

        app.Run();
    }
}
