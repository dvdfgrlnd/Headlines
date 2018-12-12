class Article_parser {
    static async find_article_text(html) {
        let bad_tags = [/SCRIPT/, /IFRAME/, /STYLE/, /LINK/, /META/, /HEADER/, /BODY/];
        let unlikelyCandidates = /-ad-|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|foot|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i;
        let model = await tf.loadModel('http://localhost:5000/model.json');
        let only_leaf_nodes = true;
        console.log(model);
        let possible_node = (node) => {
            let matchString = node.className + " " + node.id;
            return !unlikelyCandidates.test(matchString) &&
                !bad_tags.some(v => v.test(node.tagName)) &&
                node.textContent.trim().length !== 0 &&
                !(only_leaf_nodes && node.children.length !== 0);
        };
        let nodes = Node_extraction.find_all_blocks(html, 0, possible_node);
        let features = this.compute_features(nodes);
        let feature_tensor = tf.tensor2d(features);
        let pred = model.predict(feature_tensor);
        pred = pred.dataSync();
        // Convert TypedArray to Array
        pred = Array.prototype.slice.call(pred);
        var new_arr = [];
        // Reshape array into N x 2 from 2N x 1, (N = number of nodes)
        while (pred.length) new_arr.push(pred.splice(0, 2));
        pred = new_arr;
        for (let i = 0; i < nodes.length; i++) {
            // Remove the node if the 'noise' class is larger than the 'content' class 
            if (pred[i][0] >= 0.5) {
                nodes[i].remove();
            }
        }
        // Remove the nodes that was labeled noise before classification
        let should_prune = (node) => {
            let matchString = node.className + " " + node.id;
            return (unlikelyCandidates.test(matchString) ||
                bad_tags.some(v => v.test(node.tagName)) ||
                node.textContent.trim().length === 0) &&
                !(only_leaf_nodes && node.children.length !== 0);
        };
        let nodes_to_prune = Node_extraction.find_all_blocks(html, 0, should_prune);
        // Remove ancestors that don't have any text. Otherwise there will be nodes that take up space 
        nodes_to_prune.forEach(n => {
            let parent = n.parentElement;
            n.remove();
            while (parent && parent.textContent.trim().length === 0) {
                let new_parent = parent.parentElement;
                parent.remove();
                parent = new_parent;
            }
        });
        // Return pruned document
        return html;
    }

    static compute_features(nodes) {
        let features = (node) => {
            let text = node.textContent;
            let count_depth = (n, d) => {
                if (n.parentElement) {
                    return count_depth(n.parentElement, d + 1);
                } else {
                    return d;
                }
            };
            let match_regex = (string_content, re) => {
                let tmp = string_content.match(re);
                if (!tmp) {
                    tmp = [];
                }
                return tmp;
            };
            let word_frequency = text.split(' ').length;
            let depth = count_depth(node, 0);
            let num_siblings = node.parentElement.children.length;
            let uppercase_ratio = match_regex(text, /[A-ZÅÄÖ]/g).length / text.length;
            let digit_ratio = match_regex(text, /[0-9]/g).length / text.length;
            let have_dot = /\./.test(text) ? 1 : 0;
            let have_date = /[0-3]?[0-9]\/[0-3]?[0-9]\/(?:[0-9]{2})?[0-9]{2}/.test(text) ? 1 : 0;
            let hyperlink_wrapped = node.tagName === 'P' ? 1 : 0;
            return [word_frequency, depth, num_siblings, uppercase_ratio, digit_ratio, have_dot, have_date, hyperlink_wrapped];
        };
        return nodes.map(features)
    }
}
