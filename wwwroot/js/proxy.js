function display_headlines(nodes, url) {
    let container = document.getElementById('container');
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    nodes.forEach((n, i) => {
        let headline_container = document.createElement('div');
        headline_container.classList.add("article_container");
        headline_container.id = i;

        let link_button_container = document.createElement('div');
        link_button_container.classList.add("headline_container");

        // Headline link
        let link = document.createElement('a');
        link.className = 'headlinelink';
        link.href = n.link;
        link.appendChild(document.createTextNode(n.node.formated_text));

        // Preview button
        let preview_button = document.createElement('button');
        preview_button.classList.add("button");
        preview_button.classList.add("preview_button");
        let t = (event) => preview(link.href);
        // preview_button.addEventListener('click', t);
        preview_button.setAttribute("onClick", `javascript: preview("${link.href}",${i})`);
        preview_button.innerText = "preview";

        link_button_container.appendChild(link);
        link_button_container.appendChild(preview_button);
        // Preview container
        let preview_container = document.createElement("div");
        preview_container.setAttribute("onClick", `javascript: preview("${link.href}",${i})`);
        preview_container.classList.add("preview_container");

        headline_container.appendChild(link_button_container);
        headline_container.appendChild(preview_container);

        container.appendChild(headline_container);
    });
}


let stop_animation = () => {
    // Hide loading animation
    let obj = document.getElementById("loading_object");
    obj.classList.add("paused");
    document.getElementById("loading_container").classList.add("hide");
};

function is_visible(node) {
    var rect = node.getBoundingClientRect();

    return (rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth));
}

function preview(url, id) {
    let preview_container = document.getElementById(id).querySelector(".preview_container");
    // Check if the preview container is open, i.e. it contains text
    if (preview_container.innerText) {
        preview_container.innerText = "";
        preview_container.style.display = 'none';

        // Scroll to last viewed headline
        let headline_container = document.getElementById(id).querySelector(".headline_container");
        if (!is_visible(headline_container)) {
            headline_container.scrollIntoView();
        }
        return
    }
    preview_container.style.display = 'block';

    let EXPIRATION_TIME_SECONDS = 600;
    let cached = try_get_cached_site(url, EXPIRATION_TIME_SECONDS);
    if (false && cached) {
        preview_container.innerText = cached;
        return;
    }

    let request_url = '/proxy/site/' + encodeURIComponent(url);
    fetch(request_url).then((response) => {
        return response.text();
    }).then((html) => {
        let parser = new DOMParser();
        let html_doc = parser.parseFromString(html, "text/html");
        Article_parser.find_article_text(html_doc.body).then((html) => {
            if (html) {
                // console.log(node.formated_text);
                preview_container.innerHTML = html.innerHTML;

                // Store the text in cache
                // add_site_to_cache(url, text);
            } else {
                preview_container.innerText = "Couldn't retrieve article";
            }
        }).catch(reason => console.log('Error', reason));
    }).catch(reason => console.log('Error', reason));
}

function try_get_cached_site(url, EXPIRATION_TIME_SECONDS) {
    let item = localStorage.getItem(url);
    if (item) {
        // Store a timestamp when site was last_used to clear localstorage if the user haven't fetched or used anything in the last EXPIRATION_TIME_SECONDS seconds
        let last_used = localStorage.getItem("last_used");
        // If last_used isn't set, the site isn't stored. And if the cache was last used EXPIRATION_TIME_SECONDS seconds ago, the cache is too old and should be cleared
        if (!last_used || (((Date.now() - parseInt(last_used)) / 1000) > EXPIRATION_TIME_SECONDS)) {
            localStorage.clear();
            return null;
        }
        // Use stored html 
        let delimiter_index = item.indexOf("|");
        let time = parseInt(item.substring(0, delimiter_index));
        let diff_seconds = (Date.now() - time) / 1000;
        if (diff_seconds < EXPIRATION_TIME_SECONDS) {
            // localStorage.setItem("last_used", Date.now());
            // The site was recently cached
            let html = item.substring(delimiter_index + 1);
            return html;
        }
    }
    return null;
}

function add_site_to_cache(url, html) {
    localStorage.setItem("last_used", Date.now());
    let timestamp_and_html = `${Date.now()}|${html}`;
    localStorage.setItem(url, timestamp_and_html);
}

let t = "/proxy/";
let request_url = window.location.href;
request_url = request_url.substr(request_url.indexOf(t) + t.length);
let url = '/proxy/site/' + encodeURIComponent(request_url);

let headline_container = document.getElementById("container");
let fetch_site = true;
let EXPIRATION_TIME_SECONDS = 240;
let html = try_get_cached_site(url, EXPIRATION_TIME_SECONDS);
if (html) {
    fetch_site = false;
    stop_animation();
    headline_container.innerHTML = html;
}


if (fetch_site) {
    fetch(url).then((response) => {
        return response.text();
    }).then((html) => {
        let t0 = performance.now();
        let nodes = Headlines.get_headlines(html, request_url);
        let t1 = performance.now();
        console.log("time (ms): " + (t1 - t0));
        // Stop animation
        stop_animation();
        // Populate headline list
        display_headlines(nodes, request_url);

        // Store the nodes
        let headline_html = headline_container.innerHTML;
        // add_site_to_cache(url, headline_html);
    }).catch(reason => console.log('Error', reason));
}

let favorite_button = document.getElementById("favorite_button");
favorite_button.addEventListener("click", (event) => {
    if (favorite_button.classList.contains("fully-visible")) {
        favorite_button.classList.remove("fully-visible");
        Favorites.remove(request_url);
    } else {
        favorite_button.classList.add("fully-visible");
        Favorites.set(request_url);
    }
});

// Check if current site is a favorite
// Encapsulate to avoid variable declaration collision
(() => {
    let favorites = Favorites.get();
    if (favorites[request_url]) {
        favorite_button.classList.add("fully-visible");
    }
})();