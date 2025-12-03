window.Shapes = (() => {

    function generateRandomData(count) {
        return Array.from({ length: count }, () => ({
            x: Math.random() * 100,
            y: Math.random() * 100
        }));
    }

    function generateMoons(count) {
        const points = [];
        const n_half = Math.floor(count / 2);
        const radius = 20;
        const thickness = 3;
        const separation = -5;
    
        // First moon (upper arc)
        for (let i = 0; i < n_half; i++) {
            const angle = (i / (n_half - 1)) * Math.PI;
            const r = radius + (Math.random() - 0.5) * thickness;
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            points.push({ x, y });
        }
    
        // Second moon (lower arc, shifted)
        for (let i = 0; i < count - n_half; i++) {
            const angle = (i / (count - n_half - 1)) * Math.PI;
            const r = radius + (Math.random() - 0.5) * thickness;
            const x = r * Math.cos(angle) - radius + separation;
            const y = -r * Math.sin(angle) - separation;
            points.push({ x, y });
        }
    
        // Center the whole thing in the 100x100 box
        return points.map(p => ({
            x: p.x + 50,
            y: p.y + 45
        }));
    }
    
    function generateConcentricCircles(count) {
        const result = [];
        const center = { x: 50, y: 50 };
        const radii = [10, 28, 46]; // Increased spacing between circles
        const noise = 0.3; // Very small noise for tight, connected circles
        const pointsPerCircle = Math.floor(count / radii.length);
    
        radii.forEach((radius, index) => {
            let numPoints = pointsPerCircle;
            if (index === radii.length - 1) {
                numPoints = count - (pointsPerCircle * (radii.length - 1));
            }
    
            // Use evenly spaced angles to ensure no gaps
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * 2 * Math.PI;
                const r = radius + (Math.random() * noise - noise / 2);
                result.push({
                    x: center.x + r * Math.cos(angle),
                    y: center.y + r * Math.sin(angle)
                });
            }
        });
        return result;
    }


    function generateGaussianBlobs(count) {
        const result = [];
        const numBlobs = 4; // Always generate 4 blobs
        const minDistance = 35; // Increased distance for better separation
        const centers = [];

        function farEnough(x, y) {
            return centers.every(c => Math.hypot(c.x - x, c.y - y) >= minDistance);
        }

        while (centers.length < numBlobs) {
            const x = 15 + Math.random() * 70;
            const y = 15 + Math.random() * 70;
            if (farEnough(x, y)) {
                centers.push({ x, y });
            }
        }

        const stdDev = 4.5; // tighter clusters

        function gaussianRandom() {
            const u = Math.random();
            const v = Math.random();
            return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        }

        for (let i = 0; i < count; i++) {
            const c = centers[i % numBlobs];
            result.push({
                x: c.x + gaussianRandom() * stdDev,
                y: c.y + gaussianRandom() * stdDev
            });
        }
        return result;
    }

    function generateElongatedGaussianCloud(count) {
        const points = [];
        const centerX = 50;
        const centerY = 50;
        
        function randn_bm() {
            let u = 0, v = 0;
            while(u === 0) u = Math.random();
            while(v === 0) v = Math.random();
            return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
        }

        // Rotate 45 degrees
        const angle = Math.PI / 4;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        for(let i=0; i<count; i++) {
            // Generate in axis-aligned space first
            // Long axis x, short axis y
            const xRaw = randn_bm() * 25; 
            const yRaw = randn_bm() * 5;

            // Rotate
            const xRot = xRaw * cos - yRaw * sin;
            const yRot = xRaw * sin + yRaw * cos;

            points.push({
                x: Math.max(0, Math.min(100, centerX + xRot)),
                y: Math.max(0, Math.min(100, centerY + yRot))
            });
        }
        return points;
    }

    function generateTwoClustersDiagonally(count) {
        const points = [];
        const count1 = Math.floor(count / 2);
        const count2 = count - count1;
        
        function randn_bm() {
            let u = 0, v = 0;
            while(u === 0) u = Math.random();
            while(v === 0) v = Math.random();
            return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
        }

        // Cluster 1: (30, 70)
        for(let i=0; i<count1; i++) {
            points.push({
                x: Math.max(0, Math.min(100, 25 + randn_bm() * 6)),
                y: Math.max(0, Math.min(100, 75 + randn_bm() * 6))
            });
        }

        // Cluster 2: (70, 30)
        for(let i=0; i<count2; i++) {
            points.push({
                x: Math.max(0, Math.min(100, 75 + randn_bm() * 6)),
                y: Math.max(0, Math.min(100, 25 + randn_bm() * 6))
            });
        }

        return points;
    }

    function generateThinSCurve(count) {
        const points = [];
        // S-curve function: x from 20 to 80
        // y = 50 + 30 * sin( (x-20)/60 * 2*PI ) or similar

        for(let i=0; i<count; i++) {
            const t = Math.random(); // 0 to 1
            const x = 20 + t * 60;
            // Sine wave for S shape
            // We want roughly one full cycle or half cycle? S usually implies half-ish or full.
            // Let's do a nice smooth curve.
            const y = 50 + 30 * Math.sin((t - 0.5) * Math.PI * 1.5); // -0.75pi to 0.75pi

            // Add noise
            const noiseX = (Math.random() - 0.5) * 4;
            const noiseY = (Math.random() - 0.5) * 4;

            points.push({
                x: Math.max(0, Math.min(100, x + noiseX)),
                y: Math.max(0, Math.min(100, y + noiseY))
            });
        }
        return points;
    }



    function generateSpiralData(count) {
        const points = [];
        const centerX = 50, centerY = 50; 
        const maxRadius = 40; 
        const maxAngle = 4 * Math.PI; 
        
        for (let i = 0; i < count; i++) {
            const t = i / count; 
            const angle = t * maxAngle;
            const r = t * maxRadius; 
            points.push({
                x: centerX + r * Math.cos(angle),
                y: centerY + r * Math.sin(angle)
            });
        }
        return points;
    }

    function generateDataByShape(shape, count) {
        switch (shape) {
            case "circle": return generateConcentricCircles(count);
            case "moons": return generateMoons(count);
            case "spiral": return generateSpiralData(count);
            case "gaussian": return generateGaussianBlobs(count);
            case "elongated": return generateElongatedGaussianCloud(count);
            case "diagonal": return generateTwoClustersDiagonally(count);
            case "scurve": return generateThinSCurve(count);
            default: return generateRandomData(count);
        }
    }


    return {
        generateDataByShape
    };

})();
