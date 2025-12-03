document.addEventListener('DOMContentLoaded', () => {
    const kmeansLink = document.getElementById('kmeans-link');
    const hierarchicalLink = document.getElementById('hierarchical-link');
    const dbscanLink = document.getElementById('dbscan-link');
    const pcaLink = document.getElementById('pca-link'); // Added
    const mainTitle = document.getElementById('main-title');
    const kmeansControls = document.getElementById('kmeans-controls');
    const hierarchicalControls = document.getElementById('hierarchical-controls');
    const dbscanControls = document.getElementById('dbscan-controls');
    const pcaControls = document.getElementById('pca-controls'); // Added
    const plotContainerInner = document.getElementById('plot-container-inner');
    const dendrogramDiv = document.getElementById('dendrogram');
    const nextStepBtn = document.getElementById('next-step-btn');
    const autoplayBtn = document.getElementById('autoplay-btn');
    const fastforwardBtn = document.getElementById('fastforward-btn');
    const epsilonValue = document.getElementById('epsilon-value');
    const epsilonDisplay = document.getElementById('epsilon-display');
    const pointsControl = document.getElementById('points-control');
    const shapeType = document.getElementById('shape-type');

    // Store original options
    const originalShapeOptions = Array.from(shapeType.options).map(opt => ({ value: opt.value, text: opt.text }));

    function updateShapeOptions(algo) {
        shapeType.innerHTML = '';
        
        if (algo === 'pca') {
            const pcaOptions = [
                { value: 'elongated', text: 'Elongated Gaussian Cloud' },
                { value: 'diagonal', text: 'Two Clusters Spread Diagonally' },
                { value: 'scurve', text: 'Thin S-curve' },
                { value: 'random', text: 'Random' }
            ];
            
            pcaOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.text = opt.text;
                shapeType.appendChild(option);
            });
            shapeType.value = 'elongated';
        } else {
            originalShapeOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.text = opt.text;
                if (opt.value === 'random') option.selected = true;
                shapeType.appendChild(option);
            });
            shapeType.value = 'random';
        }
        // Trigger input event to handle UI state (points control visibility)
        shapeType.dispatchEvent(new Event('input'));
    }

    let activeAlgorithm = 'kmeans'; // or 'hierarchical' or 'dbscan' or 'pca'
    let autoplayInterval = null; // Store the interval ID for auto-play
    let autoplayButtonGuard = null; // High-frequency interval to keep button disabled
    let isAutoplayActive = false; // Flag to track if auto-play is currently running

    function getNumPoints() {
        // This function is now simplified: it ALWAYS reads from the input.
        return parseInt(document.getElementById('points-value').value, 10);
    }

    function reinitializeCurrentAlgorithmPlot() {
        const numPoints = getNumPoints();
        if (activeAlgorithm === 'kmeans') {
            window.KMeans.initializePlot(numPoints);
        } else if (activeAlgorithm === 'hierarchical') {
            window.Hierarchical.initializePlot(numPoints);
        } else if (activeAlgorithm === 'dbscan') {
            window.DBSCAN.initializePlot(numPoints);
        } else if (activeAlgorithm === 'pca') {
            window.PCA.initializePlot(numPoints);
        }
    }


    function switchAlgorithm(algo) {
        activeAlgorithm = algo;

        // Update shape options based on algorithm
        updateShapeOptions(algo);

        // Update active link
        document.querySelectorAll('.sidebar nav ul li a').forEach(link => link.classList.remove('active'));
        document.getElementById(`${algo}-link`).classList.add('active');

        stopAutoplay(); // Stop auto-play when switching algorithms (this also stops the guard)
        
        // Hide all controls first
        kmeansControls.classList.add('hidden');
        hierarchicalControls.classList.add('hidden');
        dbscanControls.classList.add('hidden');
        if (pcaControls) pcaControls.classList.add('hidden');

        if (algo === 'kmeans') {
            mainTitle.textContent = 'K-Means Clustering Visualizer';
            kmeansControls.classList.remove('hidden');
            plotContainerInner.classList.remove('two-panel');
            plotContainerInner.classList.add('single-plot');
            plotContainerInner.classList.remove('dbscan-view'); // Ensure DBSCAN view is off
            dendrogramDiv.classList.add('hidden');
            nextStepBtn.style.display = 'inline-block';
            autoplayBtn.style.display = 'inline-block';
            fastforwardBtn.style.display = 'inline-block';
            autoplayBtn.disabled = true; // Disable until start is pressed
            reinitializeCurrentAlgorithmPlot();
        } else if (algo === 'hierarchical') {
            mainTitle.textContent = 'Hierarchical Clustering Visualizer';
            hierarchicalControls.classList.remove('hidden');
            plotContainerInner.classList.remove('single-plot');
            plotContainerInner.classList.add('two-panel');
            plotContainerInner.classList.remove('dbscan-view'); // Ensure DBSCAN view is off
            dendrogramDiv.classList.remove('hidden');
            nextStepBtn.style.display = 'inline-block';
            autoplayBtn.style.display = 'inline-block';
            fastforwardBtn.style.display = 'inline-block';
            autoplayBtn.disabled = true; // Disable until start is pressed
            reinitializeCurrentAlgorithmPlot();
        } else if (algo === 'dbscan') {
            mainTitle.textContent = 'DBSCAN Clustering Visualizer';
            dbscanControls.classList.remove('hidden');
            plotContainerInner.classList.remove('two-panel');
            plotContainerInner.classList.add('single-plot');
            plotContainerInner.classList.add('dbscan-view'); // Activate special DBSCAN view
            dendrogramDiv.classList.add('hidden');
            nextStepBtn.style.display = 'inline-block'; 
            autoplayBtn.style.display = 'inline-block';
            fastforwardBtn.style.display = 'inline-block';
            autoplayBtn.disabled = true; // Disable until start is pressed
            reinitializeCurrentAlgorithmPlot();
        } else if (algo === 'pca') {
            mainTitle.textContent = 'Principal Component Analysis';
            if (pcaControls) pcaControls.classList.remove('hidden');
            plotContainerInner.classList.remove('two-panel');
            plotContainerInner.classList.add('single-plot');
            plotContainerInner.classList.remove('dbscan-view'); // Ensure DBSCAN view is off
            dendrogramDiv.classList.add('hidden');
            nextStepBtn.style.display = 'inline-block';
            autoplayBtn.style.display = 'inline-block'; // PCA can use autoplay to step through
            fastforwardBtn.style.display = 'none'; // Disable fast forward for PCA as it's about specific steps
            autoplayBtn.disabled = true;
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

    if (pcaLink) {
        pcaLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchAlgorithm('pca');
        });
    }

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
            let isInProgress = false;
            if (activeAlgorithm === 'kmeans') isInProgress = window.KMeans.isVisualizationInProgress();
            else if (activeAlgorithm === 'hierarchical') isInProgress = window.Hierarchical.isVisualizationInProgress();
            else if (activeAlgorithm === 'dbscan') isInProgress = window.DBSCAN.isVisualizationInProgress();
            else if (activeAlgorithm === 'pca') isInProgress = window.PCA.isVisualizationInProgress();

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
        let isInProgress = false;
        if (activeAlgorithm === 'kmeans') isInProgress = window.KMeans.isVisualizationInProgress();
        else if (activeAlgorithm === 'dbscan') isInProgress = window.DBSCAN.isVisualizationInProgress();
        else if (activeAlgorithm === 'hierarchical') isInProgress = window.Hierarchical.isVisualizationInProgress(); // Added check for hierarchical if needed, or assume false
        else if (activeAlgorithm === 'pca') isInProgress = window.PCA.isVisualizationInProgress();

        if (!isInProgress) {
            // Start visualization first if not already started
            if (activeAlgorithm === 'kmeans') window.KMeans.startVisualization();
            else if (activeAlgorithm === 'hierarchical') window.Hierarchical.startVisualization();
            else if (activeAlgorithm === 'dbscan') window.DBSCAN.startVisualization();
            else if (activeAlgorithm === 'pca') window.PCA.startVisualization();
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

            let stillInProgress = false;
            if (activeAlgorithm === 'kmeans') stillInProgress = window.KMeans.isVisualizationInProgress();
            else if (activeAlgorithm === 'hierarchical') stillInProgress = window.Hierarchical.isVisualizationInProgress();
            else if (activeAlgorithm === 'dbscan') stillInProgress = window.DBSCAN.isVisualizationInProgress();
            else if (activeAlgorithm === 'pca') stillInProgress = window.PCA.isVisualizationInProgress();

            if (stillInProgress) {
                // Ensure button stays disabled before performing step
                nextStepBtn.disabled = true;
                
                // Perform next step (await to ensure it completes)
                if (activeAlgorithm === 'kmeans') await window.KMeans.performNextStep();
                else if (activeAlgorithm === 'hierarchical') await window.Hierarchical.performNextStep();
                else if (activeAlgorithm === 'dbscan') await window.DBSCAN.performNextStep();
                else if (activeAlgorithm === 'pca') await window.PCA.performNextStep();
                
                // Button guard will keep it disabled
            } else {
                // Algorithm finished, stop auto-play
                stopAutoplay();
            }
        }, activeAlgorithm === 'pca' ? 4000 : 1000); // PCA needs more time for animations
    }

    startBtn.addEventListener('click', () => {
        stopAutoplay(); // Stop auto-play if running
        if (activeAlgorithm === 'kmeans') {
            window.KMeans.startVisualization();
        } else if (activeAlgorithm === 'hierarchical') {
            window.Hierarchical.startVisualization();
        } else if (activeAlgorithm === 'dbscan') {
            window.DBSCAN.startVisualization();
        } else if (activeAlgorithm === 'pca') {
            window.PCA.startVisualization();
        }
        autoplayBtn.disabled = false; // Enable auto-play button after start
    });

    nextStepBtn.addEventListener('click', () => {
        if (autoplayInterval) return; // Don't allow manual steps during auto-play
        if (activeAlgorithm === 'kmeans') {
            window.KMeans.performNextStep();
        } else if (activeAlgorithm === 'hierarchical') {
            window.Hierarchical.performNextStep();
        } else if (activeAlgorithm === 'dbscan') {
            window.DBSCAN.performNextStep();
        } else if (activeAlgorithm === 'pca') {
            window.PCA.performNextStep();
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
        } else if (activeAlgorithm === 'dbscan') {
            window.DBSCAN.fastForward();
        }
        // PCA fast forward not implemented/enabled
    });

    const pointsValueInput = document.getElementById('points-value');
    pointsValueInput.addEventListener('input', () => {
        reinitializeCurrentAlgorithmPlot();
    });

    shapeType.addEventListener('input', () => {
        // Define default points for each shape
        const defaultPoints = {
            random: 150,
            circle: 400,
            moons: 75,
            spiral: 75,
            gaussian: 150,
            // PCA-specific shapes
            elongated: 150,
            diagonal: 150,
            scurve: 200,
        };

        const selectedShape = shapeType.value;
        const pointsInput = document.getElementById('points-value');
        
        // Set the default value in the input field
        if (defaultPoints[selectedShape]) {
            pointsInput.value = defaultPoints[selectedShape];
        }

        // The points control is now ALWAYS visible, so we remove the hide/show logic.
        pointsControl.classList.remove('hidden');
        
        reinitializeCurrentAlgorithmPlot();
    });
});
