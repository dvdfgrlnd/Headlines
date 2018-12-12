class Node_extraction {

    static find_all_blocks(node, depth, func) {
        let text_nodes = [];
        let children = node.children;
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            let result = this.find_all_blocks(child, depth + 1, func);
            if (result.length > 0) {
                text_nodes = text_nodes.concat(result)
            }
        }
        if (func(node)) {
            node.depth = depth;
            text_nodes.push(node);
        }
        return text_nodes;
    }

    static search_for_text_nodes(node, min_words, max_words, depth, last_index) {
        let text_nodes = [];
        let children = node.children;
        let re = /\S/;
        node.index = last_index;
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            var [result, last_index] = this.search_for_text_nodes(child, min_words, max_words, depth + 1, last_index + 1);
            if (result.length > 0) {
                text_nodes = text_nodes.concat(result)
            }
        }
        let text = node.innerText;
        if (text && ![/SCRIPT/, /IFRAME/, /STYLE/, /LINK/, /META/].some(v => v.test(node.tagName))) {
            // Check that no child node has the same innerText as this node. Only the leaf node should be saved
            if (!text_nodes.some((v) => v.innerText === text)) {
                // Check that the text is non-empy (=contains a non-space character)
                if (re.test(text)) {
                    // Check number of words
                    let words = text.trim().split(/\s/);
                    if (words.length >= min_words && words.length <= max_words) {
                        //console.log("push");
                        node.formated_text = node.innerText.trim();
                        node.depth = depth;
                        text_nodes.push(node);
                    }
                }
            }
        }
        return [text_nodes, last_index];
    }

    static remove_nodes(list, node) {
        let children = node.children;
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            let result = this.remove_nodes(list, child);
        }
        if (list.some(v => v.test(node.tagName))) {
            node.remove()
        }
    }

    static get_text_nodes(document_node, min_words, max_words) {
        let [nodes, li] = this.search_for_text_nodes(document_node, min_words, max_words, 1, 0);
        nodes.forEach(node => this.remove_nodes([/SCRIPT/, /IFRAME/, /STYLE/, /LINK/, /META/], node));
        return nodes;
    }

}