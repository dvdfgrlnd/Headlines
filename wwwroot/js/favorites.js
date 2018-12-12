class Favorites {
    static get() {
        let favs = localStorage.getItem("favorites");
        if (!favs) {
            favs = "{}";
        }
        favs = JSON.parse(favs);
        return favs;
    }

    static save(favorites) {
        localStorage.setItem("favorites", JSON.stringify(favorites));
    }

    static set(key) {
        let favs = this.get();
        favs[key] = 1;
        this.save(favs);
    }

    static remove(key) {
        let favs = this.get();
        delete favs[key];
        this.save(favs);
    }
}