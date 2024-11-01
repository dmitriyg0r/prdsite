using System;
using System.Data.SqlClient;

public class Database
{
    private string connectionString = @"Server=.\SQLEXPRESS;Database=ScheduleDB;Trusted_Connection=True;";

    public void CreateDatabase()
    {
        // Создаем базу данных
        using (SqlConnection conn = new SqlConnection(@"Server=.\SQLEXPRESS;Database=master;Trusted_Connection=True;"))
        {
            conn.Open();

            string sql = "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ScheduleDB') CREATE DATABASE ScheduleDB;";
            using (SqlCommand cmd = new SqlCommand(sql, conn))
            {
                cmd.ExecuteNonQuery();
            }
        }

        // Создаем таблицу пользователей
        using (SqlConnection conn = new SqlConnection(connectionString))
        {
            conn.Open();

            string sql = @"
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
                CREATE TABLE Users (
                    Id INT PRIMARY KEY IDENTITY(1,1),
                    Username NVARCHAR(50) UNIQUE NOT NULL,
                    PasswordHash NVARCHAR(255) NOT NULL,
                    Role NVARCHAR(20) NOT NULL,
                    CreatedAt DATETIME DEFAULT GETDATE()
                )";
            using (SqlCommand cmd = new SqlCommand(sql, conn))
            {
                cmd.ExecuteNonQuery();
            }
        }
    }

    public bool AddUser(string username, string password, string role = "user")
    {
        try
        {
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();

                string sql = "INSERT INTO Users (Username, PasswordHash, Role) VALUES (@username, @passwordHash, @role);";
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@username", username);
                    cmd.Parameters.AddWithValue("@passwordHash", password);
                    cmd.Parameters.AddWithValue("@role", role);

                    cmd.ExecuteNonQuery();
                }
            }
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error adding user: " + ex.Message);
            return false;
        }
    }
} 