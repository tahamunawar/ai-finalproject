document.addEventListener('DOMContentLoaded', () => {
    const kmeansLink = document.getElementById('kmeans-link');
    const hierarchicalLink = document.getElementById('hierarchical-link');
    const dbscanLink = document.getElementById('dbscan-link');
    const mainTitle = document.getElementById('main-title');
    const kmeansControls = document.getElementById('kmeans-controls');
    const hierarchicalControls = document.getElementById('hierarchical-controls');
    const dbscanControls = document.getElementById('dbscan-controls');
    const plotContainerInner = document.getElementById('plot-container-inner');
    const dendrogramDiv = document.getElementById('dendrogram');
    const nextStepBtn = document.getElementById('next-step-btn');
    const autoplayBtn = document.getElementById('autoplay-btn');
    const fastforwardBtn = document.getElementById('fastforward-btn');
    const epsilonValue = document.getElementById('epsilon-value');
    const epsilonDisplay = document.getElementById('epsilon-display');
    const pointsControl = document.getElementById('points-control');
    const shapeType = document.getElementById('shape-type');

    let activeAlgorithm = 'kmeans'; // or 'hierarchical' or 'dbscan'
    let autoplayInterval = null; // Store the interval ID for auto-play
    let autoplayButtonGuard = null; // High-frequency interval to keep button disabled
    let isAutoplayActive = false; // Flag to track if auto-play is currently running

    function getNumPoints() {
        if (shapeType.value === 'random') {
            return parseInt(document.getElementById('points-value').value, 10);
        }
        if (shapeType.value === 'circle') {
            return 400;
        }
        return 75;
    }

    function reinitializeCurrentAlgorithmPlot() {
        const numPoints = getNumPoints();
        if (activeAlgorithm === 'kmeans') {
            window.KMeans.initializePlot(numPoints);
        } else if (activeAlgorithm === 'hierarchical') {
            window.Hierarchical.initializePlot(numPoints);
        } else {
            window.DBSCAN.initializePlot(numPoints);
        }
    }


    function switchAlgorithm(algo) {
        activeAlgorithm = algo;

        // Update active link
        document.querySelectorAll('.sidebar nav ul li a').forEach(link => link.classList.remove('active'));
        document.getElementById(`${algo}-link`).classList.add('active');

        stopAutoplay(); // Stop auto-play when switching algorithms (this also stops the guard)
        
        if (algo === 'kmeans') {
            mainTitle.textContent = 'K-Means Clustering Visualizer';
            kmeansControls.classList.remove('hidden');
            hierarchicalControls.classList.add('hidden');
            dbscanControls.classList.add('hidden');
            plotContainerInner.classList.remove('two-panel');
            plotContainerInner.classList.add('single-plot');
            dendrogramDiv.classList.add('hidden');
            nextStepBtn.style.display = 'inline-block';
            autoplayBtn.style.display = 'inline-block';
            fastforwardBtn.style.display = 'inline-block';
            autoplayBtn.disabled = true; // Disable until start is pressed
            reinitializeCurrentAlgorithmPlot();
        } else if (algo === 'hierarchical') {
            mainTitle.textContent = 'Hierarchical Clustering Visualizer';
            hierarchicalControls.classList.remove('hidden');
            kmeansControls.classList.add('hidden');
            dbscanControls.classList.add('hidden');
            plotContainerInner.classList.remove('single-plot');
            plotContainerInner.classList.add('two-panel');
            dendrogramDiv.classList.remove('hidden');
            nextStepBtn.style.display = 'inline-block';
            autoplayBtn.style.display = 'inline-block';
            fastforwardBtn.style.display = 'inline-block';
            autoplayBtn.disabled = true; // Disable until start is pressed
            reinitializeCurrentAlgorithmPlot();
        } else if (algo === 'dbscan') {
            mainTitle.textContent = 'DBSCAN Clustering Visualizer';
            dbscanControls.classList.remove('hidden');
            hierarchicalControls.classList.add('hidden');
            kmeansControls.classList.add('hidden');
            plotContainerInner.classList.remove('two-panel');
            plotContainerInner.classList.add('single-plot');
            dendrogramDiv.classList.add('hidden');
            nextStepBtn.style.display = 'inline-block'; // Enable for DBSCAN step-by-step
            autoplayBtn.style.display = 'inline-block';
            fastforwardBtn.style.display = 'inline-block';
            autoplayBtn.disabled = true; // Disable until start is pressed
            reinitializeCurrentAlgorithmPlot();
        }
    }

    kmeansLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchAlgorithm('kmeans');
    });

    hierarchicalLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchAlgorithm('hierarchical');
    });

    dbscanLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchAlgorithm('dbscan');
    });

    epsilonValue.addEventListener('input', (e) => {
        epsilonDisplay.textContent = e.target.value;
    });

    // Initialize with K-Means
    switchAlgorithm('kmeans');

    // This is a bit of a hack to make the functions from other files available.
    // A better approach would be to use modules.
    const resetBtn = document.getElementById('reset-btn');
    const startBtn = document.getElementById('start-btn');
    
    resetBtn.addEventListener('click', () => {
        stopAutoplay(); // Stop auto-play when resetting (this also stops the guard)
        reinitializeCurrentAlgorithmPlot();
        autoplayBtn.disabled = true; // Disable auto-play until start is pressed
    });

    function stopAutoplay() {
        if (autoplayInterval || isAutoplayActive) {
            isAutoplayActive = false;
            
            // Stop the button guard
            if (autoplayButtonGuard) {
                clearInterval(autoplayButtonGuard);
                autoplayButtonGuard = null;
            }
            
            if (autoplayInterval) {
                clearInterval(autoplayInterval);
                autoplayInterval = null;
            }
            
            autoplayBtn.textContent = 'Auto Play';
            autoplayBtn.disabled = false;
            
            // Re-enable next step button if visualization is still in progress
            const isInProgress = activeAlgorithm === 'kmeans'
                ? window.KMeans.isVisualizationInProgress()
                : activeAlgorithm === 'hierarchical'
                ? window.Hierarchical.isVisualizationInProgress()
                : window.DBSCAN.isVisualizationInProgress();
            if (isInProgress) {
                nextStepBtn.disabled = false;
            }
        }
    }

    function startAutoplay() {
        if (autoplayInterval) {
            // Already playing, stop it
            stopAutoplay();
            return;
        }

        // Check if visualization is in progress
        const isInProgress = activeAlgorithm === 'kmeans' 
            ? window.KMeans.isVisualizationInProgress()
            : window.DBSCAN.isVisualizationInProgress();

        if (!isInProgress) {
            // Start visualization first if not already started
            if (activeAlgorithm === 'kmeans') {
                window.KMeans.startVisualization();
            } else if (activeAlgorithm === 'hierarchical') {
                window.Hierarchical.startVisualization();
            } else {
                window.DBSCAN.startVisualization();
            }
        }

        // Update button state
        isAutoplayActive = true;
        autoplayBtn.textContent = 'Stop Auto Play';
        nextStepBtn.disabled = true; // Disable manual next step during auto-play

        // Start high-frequency guard to keep button disabled during auto-play
        autoplayButtonGuard = setInterval(() => {
            if (isAutoplayActive) {
                nextStepBtn.disabled = true;
            } else {
                clearInterval(autoplayButtonGuard);
                autoplayButtonGuard = null;
            }
        }, 10); // Check every 10ms to prevent any flicker

        // Start auto-play interval
        autoplayInterval = setInterval(async () => {
            if (!isAutoplayActive) {
                // Auto-play was stopped, clear interval
                clearInterval(autoplayInterval);
                autoplayInterval = null;
                return;
            }

            const stillInProgress = activeAlgorithm === 'kmeans'
                ? window.KMeans.isVisualizationInProgress()
                : activeAlgorithm === 'hierarchical'
                ? window.Hierarchical.isVisualizationInProgress()
                : window.DBSCAN.isVisualizationInProgress();

            if (stillInProgress) {
                // Ensure button stays disabled before performing step
                nextStepBtn.disabled = true;
                
                // Perform next step (await to ensure it completes)
                if (activeAlgorithm === 'kmeans') {
                    await window.KMeans.performNextStep();
                } else if (activeAlgorithm === 'hierarchical') {
                    await window.Hierarchical.performNextStep();
                } else {
                    await window.DBSCAN.performNextStep();
                }
                
                // Button guard will keep it disabled
            } else {
                // Algorithm finished, stop auto-play
                stopAutoplay();
            }
        }, 1000); // 1 second delay between steps
    }

    startBtn.addEventListener('click', () => {
        stopAutoplay(); // Stop auto-play if running
        if (activeAlgorithm === 'kmeans') {
            window.KMeans.startVisualization();
        } else if (activeAlgorithm === 'hierarchical') {
            window.Hierarchical.startVisualization();
        } else {
            window.DBSCAN.startVisualization(); // DBSCAN start will now be iterative
        }
        autoplayBtn.disabled = false; // Enable auto-play button after start
    });

    nextStepBtn.addEventListener('click', () => {
        if (autoplayInterval) return; // Don't allow manual steps during auto-play
        if (activeAlgorithm === 'kmeans') {
            window.KMeans.performNextStep();
        } else if (activeAlgorithm === 'hierarchical') {
            window.Hierarchical.performNextStep();
        } else {
            window.DBSCAN.performNextStep(); // Call DBSCAN's next step
        }
    });

    autoplayBtn.addEventListener('click', () => {
        startAutoplay();
    });

    fastforwardBtn.addEventListener('click', () => {
        stopAutoplay(); // Stop auto-play if running
        if (activeAlgorithm === 'kmeans') {
            window.KMeans.fastForward();
        } else if (activeAlgorithm === 'hierarchical') {
            window.Hierarchical.fastForward();
        } else {
            window.DBSCAN.fastForward();
        }
    });

    const pointsValueInput = document.getElementById('points-value');
    pointsValueInput.addEventListener('input', () => {
        reinitializeCurrentAlgorithmPlot();
    });

    shapeType.addEventListener('input', () => {
        if (shapeType.value === 'random') {
            pointsControl.classList.remove('hidden');
        } else {
            pointsControl.classList.add('hidden');
        }
        reinitializeCurrentAlgorithmPlot();
    });
});
