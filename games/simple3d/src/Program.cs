using OpenTK.Mathematics;
using OpenTK.Windowing.Common;
using OpenTK.Windowing.Desktop;

namespace Simple3D
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var nativeWindowSettings = new NativeWindowSettings()
            {
                Size = new Vector2i(800, 600),
                Title = "Simple 3D Game",
                // Эти настройки нужны для совместимости
                Flags = ContextFlags.ForwardCompatible
            };

            // Создаем и запускаем игру
            using (var game = new Game(GameWindowSettings.Default, nativeWindowSettings))
            {
                game.Run();
            }
        }
    }
}
