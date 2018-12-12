let button = document.getElementById('search_button');
button.addEventListener('click', () => {
    let request_url = document.getElementById('search_field').value;
    if (request_url) {
        // Remove 'http://' and 'www.' from the url
        let re = /(http:\/\/)?(www\.)/;
        let match = re.exec(request_url);
        if (match) {
            request_url = request_url.substring(match[0].length);
        }
        window.location = '/proxy/' + encodeURIComponent(request_url);
    }
}, false);

let search_field = document.getElementById("search_field");
search_field.addEventListener("keypress", (event) => {
    if (event.keyCode === 13) {
        button.click();
    }
});

// Populate suggestions based on the stores favorites
(() => {
    let favorites = Favorites.get();
    let datalist = document.getElementById("site_suggestion");
    Object.keys(favorites).forEach(key => {
        let child = document.createElement("option");
        child.value = key;
        datalist.appendChild(child);
    });
})();