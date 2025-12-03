window.PCA = (() => {
    const startBtn = document.getElementById('start-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    const completionMessage = document.getElementById('completion-message');
    const pcaControls = document.getElementById('pca-controls'); // Will need to add this to HTML
    const pcSelect = document.getElementById('pc-select'); // Will add this
    const prevStepBtn = document.getElementById('prev-step-btn');

    const SEED = 'pca-viz';
    
    let svg, dataRaw, dataCentered, mean, eigenvectors, eigenvalues;
    let step = 0; 
    // 0: Raw Data Loaded
    // 1: Mean Shown
    // 2: Data Centered
    // 3: Ellipse Shown
    // 4: Eigenvectors Shown
    // 5: Projected
    
    let xScale, yScale;
    let visualizationInProgress = false;
    let stripSvg; // For 1D representation
    let history = [];

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    function initializePlot(numPoints) {
        visualizationInProgress = false;
        step = 0;
        history = [];
        prevStepBtn.disabled = true;
        Math.seedrandom(SEED);

        const plotDiv = document.getElementById('plot');
        d3.select("#plot > svg").remove();

        // Define margins
        const margin = { top: 50, right: 20, bottom: 30, left: 40 };
        const width = (plotDiv.clientWidth - margin.left - margin.right);
        const height = width;

        svg = d3.select("#plot").append("svg")
            .attr("id", "plot-svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Center the axes around (0,0) for PCA visualization
        // Domain -100 to 100 to allow space for centered data
        xScale = d3.scaleLinear().domain([-100, 100]).range([0, width]);
        yScale = d3.scaleLinear().domain([-100, 100]).range([height, 0]);

        // Add X axis at y=0 (center)
        svg.append("g")
            .attr("transform", `translate(0,${yScale(0)})`)
            .call(d3.axisBottom(xScale).tickSizeOuter(0))
            .selectAll("text").style("fill", "#e0e0e0");

        // Add Y axis at x=0 (center)
        svg.append("g")
            .attr("transform", `translate(${xScale(0)},0)`)
            .call(d3.axisLeft(yScale).tickSizeOuter(0))
            .selectAll("text").style("fill", "#e0e0e0");

        // Add arrow marker
        const defs = svg.append("defs");
        defs.append("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 10)
            .attr("refY", 5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 z")
            .style("fill", "context-stroke");

        // Remove any existing strip
        d3.select("#pca-strip").remove();

        // Generate Data
        const shape = document.getElementById("shape-type").value;
        dataRaw = window.Shapes.generateDataByShape(shape, numPoints || 200);
        
        // Transform data to fit new scale? 
        // Original data is 0-100. New scale is -100 to 100.
        // The data will appear in the top right quadrant (0 to 100).
        // This is fine, as we will center it later.
        
        // Assign IDs
        dataRaw = dataRaw.map((d, i) => ({ ...d, id: i }));

        drawPoints(dataRaw);

        startBtn.disabled = false;
        nextStepBtn.disabled = true;
        completionMessage.classList.add('hidden');
        
        // Reset controls if any
        if (pcSelect) pcSelect.disabled = false;
    }


    function drawPoints(points, opacity = 1) {
        svg.selectAll(".point").remove();
        svg.selectAll(".point")
            .data(points, d => d.id)
            .enter().append("circle")
            .attr("class", "point")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", 4)
            .style("fill", "#555")
            .style("stroke", "#000")
            .style("stroke-width", 1)
            .style("opacity", opacity);
    }

    function calculateMean(points) {
        const sumX = points.reduce((acc, p) => acc + p.x, 0);
        const sumY = points.reduce((acc, p) => acc + p.y, 0);
        return { x: sumX / points.length, y: sumY / points.length };
    }

    function centerData(points, mean) {
        // We want to center them at (0, 0) mathematically AND visually.
        return points.map(p => ({
            x: p.x - mean.x,
            y: p.y - mean.y,
            // Visual coordinates (also 0,0 centered now because our scale is -100 to 100)
            vx: (p.x - mean.x), 
            vy: (p.y - mean.y),
            id: p.id
        }));
    }

    function calculateCovariance(points) {
        const n = points.length;
        let sumXX = 0, sumYY = 0, sumXY = 0;
        points.forEach(p => {
            sumXX += p.x * p.x;
            sumYY += p.y * p.y;
            sumXY += p.x * p.y;
        });
        return {
            xx: sumXX / (n - 1),
            yy: sumYY / (n - 1),
            xy: sumXY / (n - 1)
        };
    }

    function calculateEigen(cov) {
        // Characteristic equation: lambda^2 - Tr(A)lambda + Det(A) = 0
        const a = cov.xx;
        const b = cov.xy; // c = b
        const d = cov.yy;
        
        const trace = a + d;
        const det = a * d - b * b;
        
        const discriminant = Math.sqrt(trace * trace - 4 * det);
        const l1 = (trace + discriminant) / 2;
        const l2 = (trace - discriminant) / 2;
        
        // Eigenvectors
        // For l1: (a - l1)x + by = 0 => y = -(a - l1)/b * x
        // If b is small, use alternate: bx + (d - l1)y = 0
        
        function getVec(lambda) {
            if (Math.abs(b) > 1e-6) {
                const v = { x: 1, y: -(a - lambda) / b };
                const mag = Math.sqrt(v.x * v.x + v.y * v.y);
                return { x: v.x / mag, y: v.y / mag };
            } else {
                return { x: 1, y: 0 }; // simplified
            }
        }
        
        // Ensure vectors are orthogonal and sorted by eigenvalue magnitude
        let v1 = getVec(l1);
        let v2 = { x: -v1.y, y: v1.x }; // Perpendicular
        
        return {
            values: [l1, l2],
            vectors: [v1, v2]
        };
    }

    function startVisualization() {
        if (visualizationInProgress) return;
        visualizationInProgress = true;
        step = 0;
        startBtn.disabled = true;
        nextStepBtn.disabled = false;
        prevStepBtn.disabled = true;
        history = [];
        
        mean = calculateMean(dataRaw);
        dataCentered = centerData(dataRaw, mean); // Contains .x, .y (math) and .vx, .vy (visual)
        const cov = calculateCovariance(dataCentered);
        const eigen = calculateEigen(cov);
        eigenvalues = eigen.values;
        eigenvectors = eigen.vectors;

        // Start immediately with step 1 (Show Mean)
        performNextStep();
    }

    async function performNextStep() {
        if (!visualizationInProgress) return;
        nextStepBtn.disabled = true;

        history.push(step); // Save current step before advancing
        prevStepBtn.disabled = false;

        // This switch-case will now render the state *after* the step counter is incremented.
        // So when we call this, we are moving TO the new step.
        step++; 
        await renderStep(step);
    }

    async function performPrevStep() {
        if (history.length === 0) {
            prevStepBtn.disabled = true;
            return;
        }
        
        visualizationInProgress = true; // <-- THIS IS THE FIX
        step = history.pop(); // Restore to the previous step number
        
        // Re-render the entire visualization from scratch up to the restored step
        await reRenderToStep(step);

        if (history.length === 0) {
            prevStepBtn.disabled = true;
        }
        nextStepBtn.disabled = false;
        completionMessage.classList.add('hidden');
    }

    // New function to render a specific step's visualization
    async function renderStep(targetStep, withAnimation = true) {
        const duration = withAnimation ? 1000 : 0;
        const delay = withAnimation ? 1200 : 0;

        switch (targetStep) {
            case 1: // Show Mean
                svg.append("circle")
                    .attr("class", "mean-point")
                    .attr("cx", xScale(mean.x))
                    .attr("cy", yScale(mean.y))
                    .attr("r", 0)
                    .style("fill", "red")
                    .transition().duration(duration / 2)
                    .attr("r", 8);
                
                svg.append("text")
                    .attr("class", "mean-label")
                    .attr("x", xScale(mean.x) + 10)
                    .attr("y", yScale(mean.y) - 10)
                    .text("Mean")
                    .style("opacity", 0)
                    .style("fill", "white")
                    .transition().duration(duration / 2)
                    .style("opacity", 1);
                
                await new Promise(r => setTimeout(r, withAnimation ? 600 : 0));
                if (withAnimation) nextStepBtn.disabled = false;
                break;

            case 2: // Center Data
                svg.selectAll(".point")
                    .data(dataCentered, d => d.id)
                    .transition().duration(duration)
                    .attr("cx", d => xScale(d.vx))
                    .attr("cy", d => yScale(d.vy));

                svg.select(".mean-point")
                    .transition().duration(duration)
                    .attr("cx", xScale(0))
                    .attr("cy", yScale(0));

                svg.select(".mean-label")
                    .transition().duration(duration)
                    .attr("x", xScale(0) + 10)
                    .attr("y", yScale(0) - 10)
                    .text("Mean (0,0)");
                
                await new Promise(r => setTimeout(r, delay));
                if (withAnimation) nextStepBtn.disabled = false;
                break;

            case 3: // Covariance Ellipse
                const angle = -Math.atan2(eigenvectors[0].y, eigenvectors[0].x) * 180 / Math.PI;
                const scale = 2; // Use 2 standard deviations for a better visual fit
                
                // The eigenvalue is the variance. Standard deviation is sqrt(variance).
                const stdDev1 = Math.sqrt(eigenvalues[0]);
                const stdDev2 = Math.sqrt(eigenvalues[1]);

                // CORRECT WAY to get radius in pixels: 
                // Find the pixel length of the standard deviation along each axis.
                const rx = (xScale(stdDev1 * scale) - xScale(0));
                const ry = (yScale(0) - yScale(stdDev2 * scale));

                svg.append("ellipse")
                    .attr("class", "covariance-ellipse")
                    .attr("cx", xScale(0))
                    .attr("cy", yScale(0))
                    .attr("rx", 0)
                    .attr("ry", 0)
                    .attr("transform", `rotate(${angle}, ${xScale(0)}, ${yScale(0)})`)
                    .style("fill", "rgba(0, 255, 255, 0.1)")
                    .style("stroke", "cyan")
                    .style("stroke-width", 2)
                    .transition().duration(duration)
                    .attr("rx", Math.abs(rx))
                    .attr("ry", Math.abs(ry));

                await new Promise(r => setTimeout(r, delay));
                if (withAnimation) nextStepBtn.disabled = false;
                break;

            case 4: // Eigenvectors
                const center = { x: xScale(0), y: yScale(0) };
                const scaleVec = 2.5;

                drawArrow(center, eigenvectors[0], Math.sqrt(eigenvalues[0]) * scaleVec, "PC1 (λ1)", "blue", withAnimation);
                drawArrow(center, eigenvectors[1], Math.sqrt(eigenvalues[1]) * scaleVec, "PC2 (λ2)", "green", withAnimation);

                await new Promise(r => setTimeout(r, delay));
                if (withAnimation) nextStepBtn.disabled = false;
                break;

            case 5: // Projection
                const selectedPC = pcSelect ? pcSelect.value : 'pc1';
                const vec = selectedPC === 'pc1' ? eigenvectors[0] : eigenvectors[1];
                
                projectPoints(vec, withAnimation);
                
                await new Promise(r => setTimeout(r, withAnimation ? 3000 : 0));
                
                nextStepBtn.disabled = true;
                startBtn.disabled = false;
                visualizationInProgress = false;
                if (completionMessage) {
                    completionMessage.textContent = "PCA Visualization Completed";
                    completionMessage.classList.remove('hidden');
                }
                break;
        }
    }

    // New function to redraw the entire plot up to a certain step without animations
    async function reRenderToStep(targetStep) {
        // 1. Clear everything
        svg.selectAll(".mean-point, .mean-label, .covariance-ellipse, .arrow, .arrow-label, .proj-line").remove();
        d3.select("#pca-strip").remove();

        // 2. Reset points to their initial state
        drawPoints(dataRaw);

        // 3. Sequentially apply states up to the target step without animation
        for (let i = 1; i <= targetStep; i++) {
            await renderStep(i, false);
        }
    }

    function drawArrow(start, dir, length, label, color, withAnimation = true) {
        const duration = withAnimation ? 1000 : 0;
        const end = {
            x: start.x + dir.x * length * (xScale(1) - xScale(0)), 
            y: start.y + dir.y * length * (yScale(1) - yScale(0))
        };

        svg.append("line")
            .attr("class", "arrow")
            .attr("x1", start.x)
            .attr("y1", start.y)
            .attr("x2", withAnimation ? start.x : end.x) // Start at center and grow
            .attr("y2", withAnimation ? start.y : end.y)
            .style("stroke", color)
            .style("stroke-width", 3)
            .attr("marker-end", "url(#arrow)") 
            .transition().duration(duration)
            .attr("x2", end.x)
            .attr("y2", end.y);

        const textOffsetX = 15 * (dir.x >= 0 ? 1 : -1);
        const textOffsetY = 15 * (dir.y >= 0 ? -1 : 1);

        svg.append("text")
            .attr("class", "arrow-label")
            .attr("x", end.x + textOffsetX)
            .attr("y", end.y + textOffsetY)
            .text(label)
            .style("fill", color)
            .style("opacity", withAnimation ? 0 : 1)
            .transition().delay(duration).duration(500)
            .style("opacity", 1);
    }

    function projectPoints(axisVector, withAnimation = true) {
        const duration = withAnimation ? 1000 : 0;
        // Axis vector is unit vector.
        // Projection of P onto V is (P . V) * V
        // We are working with visual coordinates (centered at 50,50)
        
        // 1. Draw dotted lines
        svg.selectAll(".proj-line").remove();
        
        const visualData = dataCentered.map(d => ({...d}));
        
        // Add projection info
        visualData.forEach(d => {
            // d.vx, d.vy are the visual coordinates relative to 0,0 (but really they represent values centered at 50,50)
            // Actually, let's use the dataCentered values (x,y relative to mean 0,0).
            
            const dot = d.x * axisVector.x + d.y * axisVector.y;
            d.projX = dot * axisVector.x;
            d.projY = dot * axisVector.y;
            
            // Visual Proj
            d.vProjX = d.projX;
            d.vProjY = d.projY;
        });

        svg.selectAll(".proj-line")
            .data(visualData, d => d.id)
            .enter().append("line")
            .attr("class", "proj-line")
            .attr("x1", d => xScale(d.vx))
            .attr("y1", d => yScale(d.vy))
            .attr("x2", d => withAnimation ? xScale(d.vx) : xScale(d.vProjX))
            .attr("y2", d => withAnimation ? yScale(d.vy) : yScale(d.vProjY))
            .style("stroke", "#999")
            .style("stroke-dasharray", "3,3")
            .transition().duration(duration)
            .attr("x2", d => xScale(d.vProjX))
            .attr("y2", d => yScale(d.vProjY));

        // 2. Move points
        svg.selectAll(".point")
            .data(visualData, d => d.id)
            .transition().delay(duration).duration(duration)
            .attr("cx", d => xScale(d.vProjX))
            .attr("cy", d => yScale(d.vProjY))
            .style("fill", "orange");

        // 3. Show 1D strip
        if (withAnimation) {
            setTimeout(() => show1DStrip(visualData, axisVector), 2 * duration);
        } else {
            show1DStrip(visualData, axisVector);
        }
    }

    function show1DStrip(data, axisVector) {
        const container = d3.select("#plot-container-inner");
        
        d3.select("#pca-strip").remove(); // Always remove to redraw
        const strip = container.append("div")
            .attr("id", "pca-strip")
            .style("margin-top", "20px")
            .style("text-align", "center");
                
        strip.append("h3").text("1D Representation");
        
        stripSvg = strip.append("svg")
            .attr("width", "100%")
            .attr("height", 60);

        const w = stripSvg.node().getBoundingClientRect().width;
        const h = 60;
        
        // We need to map the projected values (scalars along the axis) to the strip width
        // Scalar = P . V
        const scalars = data.map(d => d.x * axisVector.x + d.y * axisVector.y);
        const minVal = Math.min(...scalars);
        const maxVal = Math.max(...scalars);
        
        const stripScale = d3.scaleLinear()
            .domain([minVal, maxVal])
            .range([50, w - 50]);

        stripSvg.append("line")
            .attr("x1", 20)
            .attr("y1", h/2)
            .attr("x2", w - 20)
            .attr("y2", h/2)
            .style("stroke", "white");

        stripSvg.selectAll(".strip-point")
            .data(scalars)
            .enter().append("circle")
            .attr("class", "strip-point")
            .attr("cx", d => stripScale(d))
            .attr("cy", h/2)
            .attr("r", 4)
            .style("fill", "orange");
    }

    // Need to define arrow marker in SVG if not exists
    // ...

    return {
        initializePlot,
        startVisualization,
        performNextStep,
        performPrevStep,
        isVisualizationInProgress: () => visualizationInProgress
    };
})();

