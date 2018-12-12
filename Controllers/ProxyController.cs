using System;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;

namespace headline.Controllers
{
    using headline;

    [Route("[controller]")]
    public class ProxyController : Controller
    {
        private HttpClient _client;
        private IMemoryCache _cache;
        private IHostingEnvironment _env;

        private static int SECONDS_TO_EXPIRATION = 30;

        public ProxyController(IHostingEnvironment env, IMemoryCache memoryCache, ISettings settings)
        {
            _env = env;
            _cache = memoryCache;
            SECONDS_TO_EXPIRATION = settings.ExpirationTime;

            var handler = new HttpClientHandler();
            handler.AllowAutoRedirect = true;
            _client = new HttpClient(handler);
        }

        // GET api/values
        [HttpGet]
        public IEnumerable<string> Get()
        {
            return new string[] { "value1", "value2" };
        }

        // GET proxy/url
        [HttpGet("{url}")]
        public ActionResult Get(string url)
        {
            //var path = System.IO.Path.Combine(_env.WebRootPath, "proxy.html");
            var path="~/proxy.html";
            return File(path, "text/html");
        }

        // GET proxy/site/url
        [HttpGet("site/{url}")]
        public async Task<string> GetWebSite(string url)
        {
            if (!url.StartsWith("http"))
            {
                var temp = "https://";
                if (!url.Contains("www"))
                {
                    temp += "www.";
                }
                url = temp + url;
            }
            string cacheEntry;
            if (!_cache.TryGetValue(url, out cacheEntry))
            {

                url = System.Web.HttpUtility.UrlDecode(url);
                HttpResponseMessage res;
                try
                {
                    res = await _client.GetAsync(url);
                    if (res.StatusCode != System.Net.HttpStatusCode.OK)
                    {
                        res = await _client.GetAsync(url.Replace("https", "http"));
                    }
                }
                catch (Exception)
                {
                    res = await _client.GetAsync(url.Replace("https", "http"));
                }
                cacheEntry = await res.Content.ReadAsStringAsync();
                // cacheEntry=System.Web.HttpUtility.HtmlDecode(cacheEntry);

                // Set cache options.
                var cacheEntryOptions = new MemoryCacheEntryOptions()
                    // Keep in cache for this time
                    .SetAbsoluteExpiration(TimeSpan.FromSeconds(SECONDS_TO_EXPIRATION));
                _cache.Set(url, cacheEntry, cacheEntryOptions);
            }
            return cacheEntry;
        }
    }
}
