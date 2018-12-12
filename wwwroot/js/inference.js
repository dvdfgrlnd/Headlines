class Inference {
    constructor(theta, mean, std) {
        this.theta = theta;
        this.mean = mean;
        this.std = std;
    }

    normalize(points) {
        for (let i = 0; i < points.length; i++) {
            let x = points[i].x;
            for (let k = 0; k < x.length; k++) {
                x[k] = (x[k] - this.mean[k]) / this.std[k];
            }
        }
        return points;
    }

    predict(points) {
        // Add bias variable
        points = this.normalize(points);
        points.forEach(v => v.x = [1].concat(v.x));
        return points.map(v => sigmoid(dot_product(this.theta, v.x)));
    }
}