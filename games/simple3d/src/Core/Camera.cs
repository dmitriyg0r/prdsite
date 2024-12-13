using OpenTK.Mathematics;

namespace Simple3D
{
    public class Camera
    {
        private Vector3 _position;
        private float _aspectRatio;

        private Vector3 _front = -Vector3.UnitZ;
        private Vector3 _up = Vector3.UnitY;
        private Vector3 _right = Vector3.UnitX;

        public Camera(Vector3 position, float aspectRatio)
        {
            _position = position;
            _aspectRatio = aspectRatio;
        }

        public Vector3 Position
        {
            get => _position;
            set => _position = value;
        }

        public Matrix4 GetViewMatrix()
        {
            return Matrix4.LookAt(_position, _position + _front, _up);
        }

        public Matrix4 GetProjectionMatrix()
        {
            return Matrix4.CreatePerspectiveFieldOfView(
                MathHelper.DegreesToRadians(45.0f),
                _aspectRatio,
                0.1f,
                100.0f);
        }
    }
} 