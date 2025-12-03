window.KMeans = (() => {
    const startBtn = document.getElementById('start-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    const kValueInput = document.getElementById('k-value');
    const distanceMetricSelect = document.getElementById('distance-metric');
    const initMethodSelect = document.getElementById('init-method');
    const completionMessage = document.getElementById('completion-message');
    const prevStepBtn = document.getElementById('prev-step-btn');

    const SEED = 'unsupervised-learning-viz';
    
    let svg, data, centroids, clusters, xScale, yScale, assignments;
    let visualizationInProgress = false;
    let iterationCount = 0;
    let history = [];

    
    const colorScale = d3.scaleOrdinal()
        .range(['#00ffff', '#ff00ff', '#ff4500', '#7fff00', '#ffd700', '#1e90ff']);
            
    function initializePlot(numPoints) {
        visualizationInProgress = false;
        history = [];
        prevStepBtn.disabled = true;
        Math.seedrandom(SEED);

        const plot = window.Plot.initialize('plot');
        svg = plot.svg;
        xScale = plot.xScale;
        yScale = plot.yScale;

        svg.append("g").attr("class", "hull-paths");

        const shape = document.getElementById("shape-type").value;
        data = window.Shapes.generateDataByShape(shape, numPoints);

        drawPoints(data);

        // Explicitly enable start and disable others for a clean initial state
        startBtn.disabled = false;
        nextStepBtn.disabled = true;
        prevStepBtn.disabled = true;
        completionMessage.classList.add('hidden');
    }

    function drawPoints(points) {
        svg.selectAll(".point").remove();
        svg.selectAll(".point")
            .data(points)
            .enter().append("circle")
            .attr("class", "point")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", 6)
            .style("fill", "#555")
            .style("stroke", "#000")
            .style("stroke-width", 1.5)
            .on("mouseover", function (event, d) {
                d3.select(this).transition().duration(100).attr("r", 9);
            })
            .on("mouseout", function (event, d) {
                d3.select(this).transition().duration(100).attr("r", 6);
            });
    }

    function drawCentroids(centroids) {
        svg.selectAll(".centroid").remove();
        svg.selectAll(".centroid")
            .data(centroids)
            .enter().append("circle")
            .attr("class", "centroid")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", 10)
            .style("fill", (d, i) => colorScale(i))
            .style("stroke", "#fff")
            .style("stroke-width", 2);
    }

    function updateCentroids(clusters) {
        return clusters.map(cluster => {
            if (cluster.length === 0) {
                return { x: Math.random() * 100, y: Math.random() * 100 };
            }
            const sumX = cluster.reduce((sum, point) => sum + point.x, 0);
            const sumY = cluster.reduce((sum, point) => sum + point.y, 0);
            return { x: sumX / cluster.length, y: sumY / cluster.length };
        });
    }

    function drawClusterHulls(clusters) {
        svg.select(".hull-paths").selectAll(".hull").remove();

        clusters.forEach((cluster, i) => {
            if (cluster.length < 3) return;
            const points = cluster.map(p => [xScale(p.x), yScale(p.y)]);
            const hull = d3.polygonHull(points);
            if (hull) {
                svg.select(".hull-paths").insert("path", ".point")
                    .attr("class", "hull")
                    .datum(hull)
                    .attr("d", d => `M${d.join("L")}Z`)
                    .style("fill", colorScale(i))
                    .style("stroke", colorScale(i))
                    .style("stroke-width", 2)
                    .style("fill-opacity", 0.15)
                    .style("stroke-linejoin", "round");
            }
        });
    }

    async function visualizeAssignment(clusters) {
        drawClusterHulls(clusters);

        svg.selectAll(".point")
            .transition().duration(500)
            .style("fill", (d) => {
                for (let i = 0; i < clusters.length; i++) {
                    if (clusters[i].includes(d)) 
                        return colorScale(i);
                }
                return "#555";
            });
        await new Promise(r => setTimeout(r, 700));
    }

    async function visualizeCentroidUpdate(newCentroids) {
        svg.selectAll(".centroid")
            .data(newCentroids)
            .transition().duration(500)
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y));
        
        centroids = newCentroids;
        await new Promise(r => setTimeout(r, 700));
    }

    function euclideanDistance(a, b) {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }

    function manhattanDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    function getDistanceFunction() {
        const metric = distanceMetricSelect.value;
        if (metric === 'manhattan') {
            return manhattanDistance;
        }
        return euclideanDistance;
    }

    // Fisher-Yates (aka Knuth) Shuffle
    function shuffle(array) {
        let currentIndex = array.length, randomIndex;
        // While there remain elements to shuffle.
        while (currentIndex != 0) {
            // Pick a remaining element.
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    // Centroid Initialization Methods
    function forgyInitialization(k) {
        // Shuffle the data array and pick the first k points
        const shuffledData = shuffle([...data]);
        return shuffledData.slice(0, k).map(d => ({ ...d }));
    }

    function randomPartitionInitialization(k) {
        const randomClusters = new Array(k).fill(0).map(() => []);
        data.forEach(point => {
            const randomIndex = Math.floor(Math.random() * k);
            randomClusters[randomIndex].push(point);
        });
        return updateCentroids(randomClusters);
    }

    function kmeansPlusPlusInitialization(k) {
        const distanceFunc = getDistanceFunction();
        const initialCentroids = [];

        // 1. Choose one center uniformly at random from among the data points.
        const firstCentroidIndex = Math.floor(Math.random() * data.length);
        const firstCentroid = data[firstCentroidIndex];
        initialCentroids.push({...firstCentroid});

        // 2. For each data point x, compute D(x), the distance between x and the nearest center that has already been chosen.
        let distances = new Array(data.length).fill(Infinity);

        for (let i = 1; i < k; i++) {
            // Update distances to the nearest centroid
            data.forEach((point, pointIndex) => {
                const dist = distanceFunc(point, initialCentroids[initialCentroids.length - 1]);
                distances[pointIndex] = Math.min(distances[pointIndex], dist);
            });

            // 3. Choose one new data point at random as a new center, using a weighted probability distribution where a point x is chosen with probability proportional to D(x)^2.
            const distSquaredSum = distances.reduce((sum, d) => sum + d * d, 0);
            const randomValue = Math.random() * distSquaredSum;
            
            let cumulativeSum = 0;
            let nextCentroidIndex = -1;

            for (let j = 0; j < distances.length; j++) {
                cumulativeSum += distances[j] * distances[j];
                if (cumulativeSum >= randomValue) {
                    nextCentroidIndex = j;
                    break;
                }
            }
            initialCentroids.push({...data[nextCentroidIndex]});
        }
        return initialCentroids;
    }

    function initializeCentroids(k) {
        const method = initMethodSelect.value;
        switch (method) {
            case 'random_partition':
                return randomPartitionInitialization(k);
            case 'kmeans++':
                return kmeansPlusPlusInitialization(k);
            case 'forgy':
            default:
                return forgyInitialization(k);
        }
    }

    function assignToClusters(data, centroids) {
        const distanceFunc = getDistanceFunction();
        const clusters = new Array(centroids.length).fill(0).map(() => []);
        data.forEach(point => {
            let minDistance = Infinity;
            let closestCentroidIndex = -1;
            centroids.forEach((centroid, i) => {
                const dist = distanceFunc(point, centroid);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestCentroidIndex = i;
                }
            });
            clusters[closestCentroidIndex].push(point);
        });
        return clusters;
    }

    function startVisualization() {
        if (visualizationInProgress) return;
        visualizationInProgress = true;
        iterationCount = 0;
        startBtn.disabled = true;
        nextStepBtn.disabled = false;
        prevStepBtn.disabled = true;
        history = [];

        // Reset random seed to ensure consistent initialization
        Math.seedrandom(SEED);

        const k = parseInt(kValueInput.value, 10);
        centroids = initializeCentroids(k);
        drawCentroids(centroids);

        // Save initial state
        assignments = new Array(data.length).fill(null);
        history.push({ 
            centroids: structuredClone(centroids), 
            assignments: [...assignments],
            iterationCount: 0
        });
    }

    async function performNextStep() {
        if (!visualizationInProgress) return;

        // Save CURRENT state before proceeding
        history.push({
            centroids: structuredClone(centroids),
            assignments: structuredClone(assignments),
            iterationCount
        });
        prevStepBtn.disabled = false;

        iterationCount++;
        nextStepBtn.disabled = true;

        // Assignment step
        clusters = assignToClusters(data, centroids);
        await visualizeAssignment(clusters);

        // Update step
        const newCentroids = updateCentroids(clusters);
        
        // Check for convergence before updating the global centroids
        const changed = JSON.stringify(centroids) !== JSON.stringify(newCentroids);

        if (changed) {
            await visualizeCentroidUpdate(newCentroids); // This function will update the global centroids
            nextStepBtn.disabled = false; // Re-enable for next step
        } else {
            visualizationInProgress = false;
            completionMessage.textContent = `Algorithm converged in ${iterationCount} steps.`;
            completionMessage.classList.remove('hidden');
        }
    }

    async function performPrevStep() {
        if (history.length <= 1) { // Can't go back from initial state
            prevStepBtn.disabled = true;
            return;
        }

        // Assuming stopAutoplay is defined elsewhere or will be added.
        // For now, we'll just disable next step.
        nextStepBtn.disabled = true; 

        const prevState = history.pop();
        
        centroids = prevState.centroids;
        assignments = prevState.assignments;
        iterationCount = prevState.iterationCount;

        // Redraw everything to the previous state without animation
        drawCentroids(centroids);

        const prevClusters = new Array(centroids.length).fill(0).map(() => []);
        if (assignments) {
            data.forEach((point, i) => {
                if (assignments[i] !== null) {
                    prevClusters[assignments[i]].push(point);
                }
            });
        }
        
        drawClusterHulls(prevClusters);
        svg.selectAll(".point")
            .style("fill", (d, i) => {
                if (assignments[i] !== null) {
                    return colorScale(assignments[i]);
                }
                return "#555";
            });

        if (history.length <= 1) {
            prevStepBtn.disabled = true;
        }
        nextStepBtn.disabled = false; // Re-enable next step
        completionMessage.classList.add('hidden');
    }

    async function fastForward() {
        // Reset any ongoing visualization
        visualizationInProgress = false;
        startBtn.disabled = true;
        nextStepBtn.disabled = true;
        completionMessage.classList.add('hidden');

        // Clear any existing visualization elements
        svg.selectAll(".hull").remove();

        // Reset random seed to ensure consistent initialization
        Math.seedrandom(SEED);

        const k = parseInt(kValueInput.value, 10);
        centroids = initializeCentroids(k);
        iterationCount = 0;
        visualizationInProgress = true;

        // Run algorithm to completion without visualization delays
        while (true) {
            iterationCount++;
            
            // Assignment step
            clusters = assignToClusters(data, centroids);
            
            // Update step
            const newCentroids = updateCentroids(clusters);
            
            // Check for convergence
            const changed = JSON.stringify(centroids) !== JSON.stringify(newCentroids);
            
            if (!changed) {
                // Converged
                centroids = newCentroids;
                break;
            }
            
            centroids = newCentroids;
        }

        // Draw final result
        clusters = assignToClusters(data, centroids);
        drawCentroids(centroids);
        drawClusterHulls(clusters);
        
        svg.selectAll(".point")
            .transition().duration(300)
            .style("fill", (d) => {
                for (let i = 0; i < clusters.length; i++) {
                    if (clusters[i].includes(d)) 
                        return colorScale(i);
                }
                return "#555";
            });

        visualizationInProgress = false;
        completionMessage.textContent = `Algorithm converged in ${iterationCount} steps.`;
        completionMessage.classList.remove('hidden');
        startBtn.disabled = false;
    }

    return {
        initializePlot,
        startVisualization,
        performNextStep,
        fastForward,
        performPrevStep,
        isVisualizationInProgress: () => visualizationInProgress
    };
})();
