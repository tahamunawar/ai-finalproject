window.Hierarchical = (() => {
    // --- DOM Elements ---
    const startBtn = document.getElementById('start-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    const completionMessage = document.getElementById('completion-message');
    const prevStepBtn = document.getElementById('prev-step-btn');

    // --- Configuration ---
    const SEED = 'unsupervised-learning-viz';
    const MAX_Y_DOMAIN = 50; 
    
    // --- State Variables ---
    let plotSvg, dendrogramSvg;
    let data, xScale, yScale, colorScale;
    let vizWidth, vizHeight; 
    
    let visualizationInProgress = false;
    let clusters = []; 
    let currentStep = 0;
    let nextColorId = 0; 
    let history = [];
    
    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    function initializePlot(numPoints) {
        visualizationInProgress = false;
        history = [];
        prevStepBtn.disabled = true;
        Math.seedrandom(SEED);
        
        // 1. Initialize Scatter Plot
        const plotDiv = document.getElementById('plot');
        d3.select('#plot > svg').remove();
        
        const plotMargin = { top: 50, right: 10, bottom: 30, left: 40 };
        const plotWidth = (plotDiv.clientWidth - plotMargin.left - plotMargin.right);
        const plotHeight = plotWidth; 

        plotSvg = d3.select("#plot").append("svg")
            .attr("id", "plot-svg")
            .attr("width", plotWidth + plotMargin.left + plotMargin.right)
            .attr("height", plotHeight + plotMargin.top + plotMargin.bottom)
            .append("g")
            .attr("transform", `translate(${plotMargin.left},${plotMargin.top})`);

        xScale = d3.scaleLinear().domain([0, 100]).range([0, plotWidth]);
        yScale = d3.scaleLinear().domain([0, 100]).range([plotHeight, 0]);

        plotSvg.append("g")
            .attr("transform", `translate(0,${plotHeight})`)
            .call(d3.axisBottom(xScale).tickSizeOuter(0))
            .selectAll("text").style("fill", "#e0e0e0");
        
        plotSvg.append("g")
            .call(d3.axisLeft(yScale).tickSizeOuter(0))
            .selectAll("text").style("fill", "#e0e0e0");

        // 2. Initialize Dendrogram
        const dendrogramDiv = document.getElementById('dendrogram');
        d3.select('#dendrogram > svg').remove();
        
        const dendroMargin = { top: 50, right: 40, bottom: 30, left: 40 };
        const rawWidth = Math.max(dendrogramDiv.clientWidth, 500); 
        
        vizWidth = rawWidth - dendroMargin.left - dendroMargin.right;
        vizHeight = plotHeight; 

        dendrogramSvg = d3.select("#dendrogram").append("svg")
            .attr("id", "dendrogram-svg")
            .attr("width", rawWidth)
            .attr("height", vizHeight + dendroMargin.top + dendroMargin.bottom)
            .append("g")
            .attr("transform", `translate(${dendroMargin.left},${dendroMargin.top})`);

        // 3. Generate Data
        const shape = document.getElementById("shape-type").value;
        data = window.Shapes.generateDataByShape(shape, numPoints);

        // 4. Initialize State
        clusters = data.map((point, index) => ({
            id: index, 
            points: [point],
            indices: [index],
            colorId: null,
            children: [],
            isLeaf: true
        }));

        currentStep = 0;
        nextColorId = 0;
        colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        drawPoints();
        drawDendrogram(); 

        startBtn.disabled = false;
        nextStepBtn.disabled = true;
        completionMessage.classList.add('hidden');
        history = [];
        prevStepBtn.disabled = true;
    }

    // -------------------------------------------------------------------------
    // Math Helpers
    // -------------------------------------------------------------------------

    function euclideanDistance(a, b) {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }

    function getClusterCenter(cluster) {
        const x = cluster.points.reduce((sum, p) => sum + p.x, 0) / cluster.points.length;
        const y = cluster.points.reduce((sum, p) => sum + p.y, 0) / cluster.points.length;
        return { x, y };
    }

    // NEW HELPER: Finds the exact start/end points for the animation line
    function findConnectionPoints(cluster1, cluster2) {
        const linkageSelect = document.getElementById('linkage-method');
        const linkage = linkageSelect ? linkageSelect.value : 'single';
        
        let bestP1 = null;
        let bestP2 = null;

        if (linkage === 'single') {
            // Find Closest Pair
            let minDist = Infinity;
            for (const p1 of cluster1.points) {
                for (const p2 of cluster2.points) {
                    const dist = euclideanDistance(p1, p2);
                    if (dist < minDist) {
                        minDist = dist;
                        bestP1 = p1;
                        bestP2 = p2;
                    }
                }
            }
        } else if (linkage === 'complete') {
            // Find Farthest Pair
            let maxDist = -Infinity;
            for (const p1 of cluster1.points) {
                for (const p2 of cluster2.points) {
                    const dist = euclideanDistance(p1, p2);
                    if (dist > maxDist) {
                        maxDist = dist;
                        bestP1 = p1;
                        bestP2 = p2;
                    }
                }
            }
        } else {
            // Average (or others): Use Centroids
            bestP1 = getClusterCenter(cluster1);
            bestP2 = getClusterCenter(cluster2);
        }

        return { start: bestP1, end: bestP2 };
    }

    function clusterDistance(cluster1, cluster2) {
        const linkageSelect = document.getElementById('linkage-method');
        const linkage = linkageSelect ? linkageSelect.value : 'single';

        if (linkage === 'single') {
            let minDist = Infinity;
            for (const p1 of cluster1.points) {
                for (const p2 of cluster2.points) {
                    const dist = euclideanDistance(p1, p2);
                    if (dist < minDist) minDist = dist;
                }
            }
            return minDist;
        } else if (linkage === 'complete') {
            let maxDist = -Infinity;
            for (const p1 of cluster1.points) {
                for (const p2 of cluster2.points) {
                    const dist = euclideanDistance(p1, p2);
                    if (dist > maxDist) maxDist = dist;
                }
            }
            return maxDist;
        } else { // 'average'
            let sumDist = 0;
            let count = 0;
            for (const p1 of cluster1.points) {
                for (const p2 of cluster2.points) {
                    sumDist += euclideanDistance(p1, p2);
                    count++;
                }
            }
            return sumDist / count;
        }
    }

    function findClosestClusters() {
        let minDist = Infinity;
        let closestPair = null;

        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                const dist = clusterDistance(clusters[i], clusters[j]);
                if (dist < minDist) {
                    minDist = dist;
                    closestPair = [i, j, dist];
                }
            }
        }
        return closestPair;
    }

    // -------------------------------------------------------------------------
    // Drawing Logic
    // -------------------------------------------------------------------------

    function drawPoints(excludeClusterId = null) {
        plotSvg.selectAll(".point").remove();
        plotSvg.selectAll(".point")
            .data(data)
            .enter().append("circle")
            .attr("class", "point")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", 6)
            .style("fill", (d, i) => {
                for (let c = 0; c < clusters.length; c++) {
                    if (clusters[c].indices.includes(i)) {
                        return clusters[c].colorId !== null ? colorScale(clusters[c].colorId) : "#888";
                    }
                }
                return "#555";
            })
            .style("stroke", "#000")
            .style("stroke-width", 1.5);
        
        drawClusterCircles(excludeClusterId);
    }

    function drawClusterCircles(excludeClusterId = null) {
        const visibleClusters = clusters.filter(c => 
            c.points.length >= 2 && 
            c.colorId !== null && 
            c.id !== excludeClusterId
        );

        const existing = plotSvg.selectAll(".cluster-circle").data(visibleClusters, d => d.id);
        existing.exit().remove();
        const enter = existing.enter().append("circle").attr("class", "cluster-circle");

        existing.merge(enter)
            .each(function(cluster) {
                const center = getClusterCenter(cluster);
                let maxDist = 0;
                cluster.points.forEach(p => {
                    const d = Math.sqrt(Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2));
                    if (d > maxDist) maxDist = d;
                });
                
                const radius = xScale(maxDist + 5) - xScale(0);
                const color = colorScale(cluster.colorId);

                d3.select(this)
                    .attr("cx", xScale(center.x))
                    .attr("cy", yScale(center.y))
                    .attr("r", radius)
                    .style("fill", color)
                    .style("fill-opacity", 0.15)
                    .style("stroke", color)
                    .style("stroke-width", 2)
                    .style("stroke-opacity", 0.5);
            });
    }

    function drawDendrogram() {
        dendrogramSvg.selectAll("*").remove();

        clusters.sort((a, b) => Math.min(...a.indices) - Math.min(...b.indices));

        let orderedLeafIds = [];
        function traverseForLeaves(cluster) {
            if (cluster.isLeaf) {
                orderedLeafIds.push(cluster.id);
            } else {
                cluster.children.forEach(child => traverseForLeaves(child));
            }
        }
        clusters.forEach(c => traverseForLeaves(c));

        const leafSpacing = vizWidth / Math.max(orderedLeafIds.length - 1, 1);
        const heightScale = d3.scaleLinear()
            .domain([0, MAX_Y_DOMAIN]) 
            .range([vizHeight, 20]); 

        function drawRecursive(cluster) {
            if (cluster.isLeaf) {
                const visualIndex = orderedLeafIds.indexOf(cluster.id);
                const x = visualIndex * leafSpacing;
                const y = vizHeight;
                return {x, y};
            }

            const child1 = cluster.children[0];
            const child2 = cluster.children[1];
            const pos1 = drawRecursive(child1);
            const pos2 = drawRecursive(child2);

            const x = (pos1.x + pos2.x) / 2;
            const y = heightScale(cluster.distance || 0);
            const color = cluster.colorId !== null ? colorScale(cluster.colorId) : "#ccc";

            const lineClass = `dendro-line cluster-${cluster.id}`;

            dendrogramSvg.append("line")
                .attr("class", lineClass + " v-line")
                .attr("x1", pos1.x).attr("y1", pos1.y)
                .attr("x2", pos1.x).attr("y2", y)
                .style("stroke", color).style("stroke-width", 2);
            
            dendrogramSvg.append("line")
                .attr("class", lineClass + " v-line")
                .attr("x1", pos2.x).attr("y1", pos2.y)
                .attr("x2", pos2.x).attr("y2", y)
                .style("stroke", color).style("stroke-width", 2);
            
            dendrogramSvg.append("line")
                .attr("class", lineClass + " h-line")
                .attr("x1", pos1.x).attr("y1", y)
                .attr("x2", pos2.x).attr("y2", y)
                .style("stroke", color).style("stroke-width", 2);

            if (child1.isLeaf) drawLeafCircle(child1, pos1.x, pos1.y);
            if (child2.isLeaf) drawLeafCircle(child2, pos2.x, pos2.y);

            return {x, y};
        }

        function drawLeafCircle(c, x, y) {
            dendrogramSvg.append("circle")
                .attr("class", "dendro-leaf")
                .attr("cx", x).attr("cy", y)
                .attr("r", 4)
                .style("fill", c.colorId !== null ? colorScale(c.colorId) : "#888");
            
            dendrogramSvg.append("text")
                .attr("x", x).attr("y", y + 15)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .style("fill", "#ccc")
                .text(c.id + 1);
        }

        clusters.forEach(c => {
            if (!c.isLeaf) drawRecursive(c);
        });
    }

    // -------------------------------------------------------------------------
    // Execution Logic
    // -------------------------------------------------------------------------

    function startVisualization() {
        if (visualizationInProgress) return;
        visualizationInProgress = true;
        startBtn.disabled = true;
        nextStepBtn.disabled = false;
        completionMessage.classList.add('hidden');
        
        currentStep = 0;
        nextColorId = 0;

        clusters = data.map((point, index) => ({
            id: index,
            points: [point],
            indices: [index],
            colorId: null,
            children: [],
            isLeaf: true
        }));

        history.push(structuredClone(clusters)); // Save initial state

        drawPoints();
        drawDendrogram(); 
    }

    async function performNextStep() {
        if (!visualizationInProgress) return;
        if (clusters.length <= 1) {
            visualizationInProgress = false;
            completionMessage.textContent = `Hierarchical clustering complete.`;
            completionMessage.classList.remove('hidden');
            return;
        }

        history.push(structuredClone(clusters)); // Save state before the merge
        prevStepBtn.disabled = false;

        nextStepBtn.disabled = true;

        const closest = findClosestClusters();
        if (!closest) {
            visualizationInProgress = false;
            nextStepBtn.disabled = true;
            return;
        }

        const [i, j, distance] = closest;
        const cluster1 = clusters[i];
        const cluster2 = clusters[j];

        // --- Logic: Colors ---
        let mergedColorId;
        const c1Single = cluster1.points.length === 1;
        const c2Single = cluster2.points.length === 1;
        if (c1Single && !c2Single) mergedColorId = cluster2.colorId;
        else if (!c1Single && c2Single) mergedColorId = cluster1.colorId;
        else mergedColorId = nextColorId++;
        
        const newClusterId = data.length + currentStep;

        const mergedCluster = {
            id: newClusterId,
            points: [...cluster1.points, ...cluster2.points],
            indices: [...cluster1.indices, ...cluster2.indices],
            colorId: mergedColorId,
            children: [cluster1, cluster2],
            distance: distance,
            isLeaf: false
        };

        clusters = clusters.filter((c, idx) => idx !== i && idx !== j);
        clusters.push(mergedCluster);
        currentStep++;

        // --- ANIMATION START ---
        const duration = 700;
        
        // 1. Update Points (Colors change, but exclude circle)
        drawPoints(newClusterId); 

        // 2. Prepare Dendrogram
        drawDendrogram();
        const newLines = dendrogramSvg.selectAll(`.cluster-${newClusterId}`);

        // A. Animate Dendrogram Verticals
        newLines.filter(".v-line").each(function() {
            const line = d3.select(this);
            const finalY = line.attr("y2");
            const startY = line.attr("y1");
            line.attr("y2", startY); 
            line.transition().duration(duration).attr("y2", finalY);
        });

        // B. Animate Dendrogram Cap
        newLines.filter(".h-line").each(function() {
            const line = d3.select(this);
            line.style("opacity", 0);
            line.transition().delay(duration).duration(200).style("opacity", 1);
        });

        // C. Animate Plot Elements
        // C1. Visual Line (Based on Linkage Logic)
        const conn = findConnectionPoints(cluster1, cluster2);
        const clusterColor = colorScale(mergedColorId);
        
        const distLine = plotSvg.append("line")
            .attr("x1", xScale(conn.start.x))
            .attr("y1", yScale(conn.start.y))
            .attr("x2", xScale(conn.end.x))
            .attr("y2", yScale(conn.end.y))
            .style("stroke", clusterColor)
            .style("stroke-width", 2)
            .style("stroke-dasharray", "4,4");

        const totalLength = Math.sqrt(
            Math.pow(xScale(conn.end.x) - xScale(conn.start.x), 2) + 
            Math.pow(yScale(conn.end.y) - yScale(conn.start.y), 2)
        );
        
        distLine
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .transition().duration(duration)
            .attr("stroke-dashoffset", 0)
            .on("end", function() {
                d3.select(this).remove();
            });

        // C2. Cluster Circle (Based on Geometric Center)
        const mergedCenter = getClusterCenter(mergedCluster);
        if (mergedCluster.points.length >= 2) {
            let maxDist = 0;
            mergedCluster.points.forEach(p => {
                const d = Math.sqrt(Math.pow(p.x - mergedCenter.x, 2) + Math.pow(p.y - mergedCenter.y, 2));
                if (d > maxDist) maxDist = d;
            });
            const radius = xScale(maxDist + 5) - xScale(0);

            plotSvg.append("circle")
                .attr("class", "cluster-circle-anim")
                .attr("cx", xScale(mergedCenter.x)).attr("cy", yScale(mergedCenter.y))
                .attr("r", 0) 
                .style("fill", clusterColor).style("fill-opacity", 0)
                .style("stroke", clusterColor).style("stroke-width", 2).style("stroke-opacity", 0)
                .transition().duration(duration) 
                .attr("r", radius)
                .style("fill-opacity", 0.15).style("stroke-opacity", 0.5)
                .on("end", function() { 
                    d3.select(this).remove(); 
                    drawPoints(); 
                });
        } else {
            await new Promise(r => setTimeout(r, duration));
            drawPoints();
        }

        await new Promise(r => setTimeout(r, duration + 200));

        if (clusters.length === 1) {
            visualizationInProgress = false;
            completionMessage.textContent = `Hierarchical clustering complete.`;
            completionMessage.classList.remove('hidden');
        } else {
            nextStepBtn.disabled = false;
        }
    }

    function performPrevStep() {
        if (history.length <= 1) {
            prevStepBtn.disabled = true;
            return;
        }

        clusters = history.pop();
        
        // Find the colorId of the cluster that was just un-merged to decrement the counter
        const maxColorId = clusters.reduce((maxId, c) => {
            if (c.colorId !== null && c.colorId > maxId) {
                return c.colorId;
            }
            return maxId;
        }, -1);
        nextColorId = maxColorId + 1;
        currentStep--;


        // Redraw without animation
        drawPoints();
        drawDendrogram();

        if (history.length <= 1) {
            prevStepBtn.disabled = true;
        }
        nextStepBtn.disabled = false;
        completionMessage.classList.add('hidden');
    }

    async function fastForward() {
        visualizationInProgress = false;
        startBtn.disabled = true;
        nextStepBtn.disabled = true;
        completionMessage.classList.add('hidden');

        clusters = data.map((point, index) => ({
            id: index,
            points: [point],
            indices: [index],
            colorId: null,
            children: [],
            isLeaf: true
        }));
        currentStep = 0;
        nextColorId = 0;

        while (clusters.length > 1) {
            const closest = findClosestClusters();
            if (!closest) break;
            const [i, j, distance] = closest;
            const cluster1 = clusters[i];
            const cluster2 = clusters[j];

            let mergedColorId;
            const c1Single = cluster1.points.length === 1;
            const c2Single = cluster2.points.length === 1;
            if (c1Single && !c2Single) mergedColorId = cluster2.colorId;
            else if (!c1Single && c2Single) mergedColorId = cluster1.colorId;
            else mergedColorId = nextColorId++;

            const newId = data.length + currentStep;
            const mergedCluster = {
                id: newId,
                points: [...cluster1.points, ...cluster2.points],
                indices: [...cluster1.indices, ...cluster2.indices],
                colorId: mergedColorId,
                children: [cluster1, cluster2],
                distance: distance,
                isLeaf: false
            };

            clusters = clusters.filter((c, idx) => idx !== i && idx !== j);
            clusters.push(mergedCluster);
            currentStep++;
        }

        drawPoints();
        drawDendrogram();
        completionMessage.textContent = `Hierarchical clustering complete.`;
        completionMessage.classList.remove('hidden');
        startBtn.disabled = false;
    }

    return {
        initializePlot,
        startVisualization,
        performNextStep,
        performPrevStep,
        fastForward,
        isVisualizationInProgress: () => visualizationInProgress
    };
})();