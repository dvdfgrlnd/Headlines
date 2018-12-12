let label_blocks = function (content_node, nodes) {
    return nodes.map(n => content_node.contains(n) ? [0, 1] : [1, 0]);
}

let compute_features = function (nodes) {
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

async function train(x, y) {
    let xs = tf.tensor2d(x);
    let ys = tf.tensor2d(y);

    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 32, inputShape: [x[0].length] }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({
        units: 2,
        kernelInitializer: 'VarianceScaling',
        activation: 'softmax'
    }));
    // Prepare the model for training: Specify the loss and the optimizer.
    model.compile({ loss: 'categoricalCrossentropy', optimizer: 'adam', lr: 0.001, metrics: ['accuracy'] });

    // Train the model using the data.
    console.log('fit');
    let history = await model.fit(xs, ys, { epochs: 20 });
    return model;
};

function predict(model, x_test) {
    let xs_test = tf.tensor2d(x_test);
    let pred = model.predict(xs_test);
    console.log(pred);
    console.log(history.history);
    // Use the model to do inference on a data point the model hasn't seen before:
    // Open the browser devtools to see the output
    // model.predict(tf.tensor2d([5], [1, 1])).print();
    return pred;
}

let get_pred_nodes = function (nodes, pred) {
    pred = pred.dataSync();
    pred = Array.prototype.slice.call(pred);
    var new_arr = [];
    while (pred.length) new_arr.push(pred.splice(0, 2));
    pred = new_arr;
    let indices = pred.map((n, i) => n[1] > n[0] ? i : -1);
    indices = indices.filter(n => n !== -1);
    let pred_nodes = indices.map(i => nodes[i]);
    return pred_nodes;
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function split_data(features, labels, nodes) {
    let indices = features.map((n, i) => i);
    indices = shuffle(indices);
    let train_size = Math.floor(features.length * 0.7);
    let train_features = [];
    let train_labels = [];
    let test_features = [];
    let test_labels = [];
    let test_nodes = [];
    for (var i = 0; i < train_size; i++) {
        train_features.push(features[indices[i]]);
        train_labels.push(labels[indices[i]]);
    }
    for (var i = train_size; i < features.length; i++) {
        test_features.push(features[indices[i]]);
        test_labels.push(labels[indices[i]]);
        test_nodes.push(nodes[indices[i]]);
    }
    return [train_features, train_labels, test_features, test_labels, test_nodes];
}

async function fetchAsync() {
    let sites = [['aftonbladet', '._3p4DP,._1lEgk'], ['theverge', '.c-entry-content'], ['arstechnica', 'article-content,.post-page'], ['theguardian', '.content__main-column,.content__main-column--article,.js-content-main-column'], ['bbc', '.story-body'], ['expressen', '.article__body-text']];
    var all_features = [];
    var all_labels = [];
    var all_nodes = [];
    var site = '';
    for (var i = 0; i < sites.length; i++) {
        site = sites[i]
        for (var j = 1; j < 11; j++) {
            request_url = `data/${site[0]}/${j}.html`
            let response = await fetch(request_url);
            let html = await response.text();
            let parser = new DOMParser();
            let html_doc = parser.parseFromString(html, "text/html");
            let content_node = html_doc.querySelector(site[1]);
            let bad_tags = [/SCRIPT/, /IFRAME/, /STYLE/, /LINK/, /META/, /HEADER/, /BODY/];
            let unlikelyCandidates = /-ad-|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|foot|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i;
            let only_leaf_nodes = true;
            let possible_node = (node) => {
                let matchString = node.className + " " + node.id;
                return !unlikelyCandidates.test(matchString) &&
                    !bad_tags.some(v => v.test(node.tagName)) &&
                    node.textContent.trim().length !== 0 &&
                    !(only_leaf_nodes && node.children.length !== 0);
            };
            let nodes = Node_extraction.find_all_blocks(html_doc.body, 0, possible_node);
            // let nodes = Article_parser.find_blocks(html_doc.body, true);
            let features = compute_features(nodes);
            let labels = label_blocks(content_node, nodes);
            all_features = all_features.concat(features);
            all_labels = all_labels.concat(labels);
            all_nodes = all_nodes.concat(nodes);
            // console.log(html_doc.querySelector(`${site[1]}`));
        }
    }
    [train_features, train_labels, test_features, test_labels, test_nodes] = split_data(all_features, all_labels, all_nodes);
    console.log(test_nodes);
    console.log(test_labels);
    let model = await train(train_features, train_labels);
    // let pred = predict(model, test_features);
    // let pred_nodes = get_pred_nodes(test_nodes, pred);
    // const saveResult = await model.save('localstorage://model');
    // console.log(pred_nodes);
    // console.log(history);
    return model;
}

fetchAsync()
    .then(model => {
        model.save('downloads://model').then(d => console.log('res', d));
        console.log(model);
    })
    .catch(reason => console.log(reason));
