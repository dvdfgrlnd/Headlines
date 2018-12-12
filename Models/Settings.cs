using System;

namespace headline
{
    public class Settings : ISettings
    {
        public int ExpirationTime { get; set; }

        public Settings(int expirationTime)
        {
            ExpirationTime = expirationTime;
        }
    }
}