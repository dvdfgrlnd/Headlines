function dot_product(theta, x) {
    return theta.reduce((p, v, k) => p + (v * x[k]), 0);
}

function sigmoid(x) {
    return (1 / (1 + Math.exp(-x)));
}

