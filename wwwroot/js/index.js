(() => {
    let favorites = Favorites.get();

    let container = document.getElementById("favorites_container");
    let sites = Object.keys(favorites).sort((a, b) => a.localeCompare(b));
    sites.forEach(k => {
        let key = decodeURIComponent(k);
        let child = document.createElement("button");
        child.classList.add("button");
        child.classList.add("favorite-button");
        child.innerText = key;
        child.addEventListener("click", () => {
            window.location = "/proxy/" + encodeURIComponent(key);
        });
        container.appendChild(child);
    });
})();