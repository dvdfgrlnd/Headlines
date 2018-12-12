class Headlines {
    static find_link(node) {
        let current = node;
        while (current) {
            if (current.tagName === "A") {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }

    static is_true(node, condition_list) {
        let current = node;
        let result = ~((~0) << condition_list.length);
        while (current) {
            for (let i = 0; i < condition_list.length; i++) {
                let v = condition_list[i];
                if (v(current)) {
                    result = (~(1 << i)) & result;
                    if (result == 0) {
                        return result;
                    }
                }
            }
            current = current.parentElement;
        }
        return result;
    }

    static compute_score(node) {
        //console.log(node);
        let score = 0;
        let has_header = (v) => {
            if (!v.tagName) { return false; }
            return /^h\d/.test(v.tagName.toLowerCase());
        };
        let contain_keyword = (v) => {
            if (!v.className) { return false; }
            return /headline|title|heading/.test(v.className.toLowerCase());
        };
        let f = [has_header, contain_keyword];
        score = this.is_true(node, f);
        let ones = 0;
        // Count 1's
        for (let i = 0; i < Math.ceil(Math.log2(score)); i++) {
            ones += (score & ((1 << i))) ? 1 : 0;
        }
        score = 10 * (f.length - ones);
        // console.log(score);
        return score;
    }

    static format_link(link, base_url) {
        base_url = decodeURIComponent(base_url);
        // Extract base url
        if (link.indexOf("/") === 0) {
            let index = base_url.indexOf("/");
            index = index === -1 ? base_url.length : index;
            base_url = base_url.substring(0, index);
        }
        // Not starts with 'http'
        if (!/^http/.test(link)) {
            let prefix = 'https://';
            if (!/www/.test(link)) {
                prefix += "www.";
            }
            base_url = prefix + base_url;
        }
        link = base_url + link;
        return link;
    }

    static get_headlines(html, base_url) {
        let parser = new DOMParser();
        let html_doc = parser.parseFromString(html, "text/html");
        let min_words = 3;
        let max_words = 30;
        let nodes = Node_extraction.get_text_nodes(html_doc.documentElement, min_words, max_words);
        // Remove duplicates
        let obj = nodes.reduce((p, c) => {
            let stored_node = p[c.formated_text];
            if (!stored_node || (stored_node && stored_node.depth < c.depth)) {
                p[c.formated_text] = c;
            }
            return p;
        }, {});
        nodes = Object.keys(obj).map((v) => obj[v]);
        // Remove javascript/html
        let regex_list = [/\{|\}|\+\=/, /<[^>]+>/]
        nodes = nodes.filter(v => !regex_list.some(t => t.test(v.innerText)));
        console.log(nodes);
        let scores = nodes.map((n) => {
            return { 'node': n, 'score': this.compute_score(n) };
        });
        scores.forEach(v => {
            let link = this.find_link(v.node);
            if (link) {
                v.link = this.format_link(link.pathname, base_url);
            } else {
                v.link = null;
            }
        });
        scores = scores.filter(v => v.link !== null);
        scores = scores.sort((a, b) => b.score - a.score).slice(0, 50);
        // Sort by the index (which is added depth first)
        scores = scores.sort((a, b) => b.index - a.index)
        console.log(scores);
        scores.forEach(v => console.log(v.node.formated_text, v.score));
        return scores;
    }
}