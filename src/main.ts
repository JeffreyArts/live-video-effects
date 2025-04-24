import './vite-env.d.ts';
import { WebcamModel } from './webcam';
import { MotionDetectionService } from './motion-detection';
import { optionsService, Style, StyleType } from './options-service';
import { ImageLogicService } from './image-logic-service';


// Basis setup voor de applicatie
const webcam = new WebcamModel();
const motionDetection = new MotionDetectionService();
const imageLogicService = ImageLogicService.getInstance();

document.addEventListener('DOMContentLoaded', async () => {
    const options = optionsService.options;
    const styles = optionsService.styles;
    
    try {
        await webcam.start();
        
        // Stijl voor de elementen
        const style = document.createElement('style');
        style.textContent = `
            video,
            canvas {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
            }
            .sidebar {
                position: fixed;
                top: 0;
                right: 0;
                width: 300px;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                z-index: 1000;
                overflow-y: auto;
            }
            .sidebar.open {
                transform: translateX(0);
            }
            .toggle-button {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                border: none;
                padding: 10px;
                cursor: pointer;
                z-index: 1001;
                border-radius: 5px;
            }
            .settings-group {
                margin-bottom: 25px;
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 8px;
            }
            .settings-group h3 {
                margin: 0 0 15px 0;
                font-size: 16px;
                color: #fff;
            }
            .settings-group label {
                display: block;
                margin-bottom: 8px;
                font-size: 14px;
                color: #ccc;
            }
            .settings-group input[type="range"] {
                width: 100%;
                margin-bottom: 15px;
                background: rgba(255, 255, 255, 0.1);
                height: 4px;
                border-radius: 2px;
                -webkit-appearance: none;
            }
            .settings-group input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                background: #fff;
                border-radius: 50%;
                cursor: pointer;
            }
            .settings-group .value-display {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .settings-group .value-display span {
                font-size: 14px;
                color: #fff;
            }
            .checkbox-group {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
                padding: 8px 0;
            }
            .checkbox-group input[type="checkbox"] {
                margin-right: 10px;
                width: 16px;
                height: 16px;
                cursor: pointer;
            }
            .checkbox-group label {
                margin: 0;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);

        // Voeg de video element toe aan de body
        const videoElement = webcam['videoElement'];
        if (videoElement) {
            document.body.appendChild(videoElement);
            videoElement.style.display = options.showVideo ? 'block' : 'none';
        }

        // Maak een canvas voor de bewegingsvisualisatie
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d')!;

        // Bereken eerst alle afbeeldingen
        const imageGrid: (number)[][] = [];
        const cachedImages: { [key: string]: HTMLImageElement } = {};
        let currentStyle = styles.find(s => s.name.includes(optionsService.options.selectedStyle)) || styles[0];
        loadImages()

        function updateCanvasSize() {
            const videoElement = webcam['videoElement'];
            if (!videoElement || !ctx) return;

            // Wacht tot de video dimensies beschikbaar zijn
            if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) return;

            const windowAspectRatio = window.innerWidth / window.innerHeight;
            const videoAspectRatio = videoElement.videoWidth / videoElement.videoHeight;
            
            let canvasWidth, canvasHeight;
            
            if (windowAspectRatio > videoAspectRatio) {
                // Landscape: fit to height
                canvasHeight = window.innerHeight;
                canvasWidth = canvasHeight * videoAspectRatio;
            } else {
                // Portrait: fit to width
                canvasWidth = window.innerWidth;
                canvasHeight = canvasWidth / videoAspectRatio;
            }

            // Update zowel de canvas resolutie als de CSS dimensies
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            canvas.style.width = `${canvasWidth}px`;
            canvas.style.height = `${canvasHeight}px`;
        }

        // Voeg resize event listener toe
        window.addEventListener('resize', updateCanvasSize);

        // Voeg ook een event listener toe voor wanneer de video dimensies beschikbaar komen
        if (videoElement) {
            videoElement.addEventListener('loadedmetadata', updateCanvasSize);
        }

        // Initiële canvas size update
        updateCanvasSize();

        // Maak sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar';
        sidebar.innerHTML = `
            <div class="settings-group">
                <h3>Weergave</h3>
                <div class="checkbox-group">
                    <input type="checkbox" id="showVideo" ${options.showVideo ? 'checked' : ''}>
                    <label for="showVideo">Toon video</label>
                </div>
                <div class="value-display">
                    <label for="style">Visualisatiestijl</label>
                    <select id="style">
                         ${styles.map(style => `
                            <option value="${style.name}">
                                ${style.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
            <div class="settings-group">
                <h3>Grid Instellingen</h3>
                <div class="value-display">
                    <label for="gridX">Horizontale hokjes</label>
                    <span id="gridXValue">${options.gridSize.x}</span>
                </div>
                <input type="range" id="gridX" min="3" max="360" value="${options.gridSize.x}">
                <div class="value-display">
                    <label for="gridY">Verticale hokjes</label>
                    <span id="gridYValue">${options.gridSize.y}</span>
                </div>
                <input type="range" id="gridY" min="3" max="360" value="${options.gridSize.y}">
            </div>
            <div class="settings-group">
                <h3>Buffer Instellingen</h3>
                <div class="value-display">
                    <label for="buffer">Frame buffer</label>
                    <span id="bufferValue">${options.bufferSize}</span>
                </div>
                <input type="range" id="buffer" min="2" max="360" value="${options.bufferSize}">
            </div>
            <div class="settings-group">
                <h3>Bewegingsdetectie</h3>
                <div class="value-display">
                    <label for="threshold">Bewegingsdrempel</label>
                    <span id="thresholdValue">${options.significantChangeThreshold}</span>
                </div>
                <input type="range" id="threshold" min="1" max="100" value="${options.significantChangeThreshold}">
            </div>
        `;
        document.body.appendChild(sidebar);

        // Maak toggle knop
        const toggleButton = document.createElement('button');
        toggleButton.className = 'toggle-button';
        toggleButton.textContent = '⚙️';
        document.body.appendChild(toggleButton);

        // Toggle sidebar
        toggleButton.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Update instellingen
        const gridXInput = sidebar.querySelector('#gridX') as HTMLInputElement;
        const gridYInput = sidebar.querySelector('#gridY') as HTMLInputElement;
        const bufferInput = sidebar.querySelector('#buffer') as HTMLInputElement;
        const showVideoInput = sidebar.querySelector('#showVideo') as HTMLInputElement;
        const thresholdInput = sidebar.querySelector('#threshold') as HTMLInputElement;
        const styleSelect = sidebar.querySelector('#style') as HTMLSelectElement;

        // Pas de opties toe na het laden
        if (videoElement) {
            optionsService.applyOptions(motionDetection, videoElement);
        } else {
            optionsService.applyOptions(motionDetection);
        }

        gridXInput.addEventListener('input', () => {
            const value = parseInt(gridXInput.value);
            sidebar.querySelector('#gridXValue')!.textContent = value.toString();
            optionsService.setGridSize(value, options.gridSize.y);
            motionDetection['gridSize'].x = value;
            console.log(options)
        });

        gridYInput.addEventListener('input', () => {
            const value = parseInt(gridYInput.value);
            sidebar.querySelector('#gridYValue')!.textContent = value.toString();
            optionsService.setGridSize(options.gridSize.x, value);
            motionDetection['gridSize'].y = value;
        });

        bufferInput.addEventListener('input', () => {
            const value = parseInt(bufferInput.value);
            sidebar.querySelector('#bufferValue')!.textContent = value.toString();
            optionsService.setBufferSize(value);
            motionDetection['bufferSize'] = value;
        });

        showVideoInput.addEventListener('change', () => {
            if (videoElement) {
                const isChecked = showVideoInput.checked;
                videoElement.style.display = isChecked ? 'block' : 'none';
                optionsService.setShowVideo(isChecked);
            }
        });

        thresholdInput.addEventListener('input', () => {
            const value = parseInt(thresholdInput.value);
            sidebar.querySelector('#thresholdValue')!.textContent = value.toString();
            optionsService.setSignificantChangeThreshold(value);
            motionDetection['significantChangeTreshold'] = value;
        });

        // Update de geselecteerde stijl in de dropdown
        styleSelect.value = options.selectedStyle;

        styleSelect.addEventListener('change', () => {
            const newStyle = styleSelect.value as StyleType;
            optionsService.setSelectedStyle(newStyle);
            currentStyle = styles.find(s => s.name.includes(optionsService.options.selectedStyle)) || styles[0];
            loadImages()
        });

        function loadImages() {
            if (currentStyle?.type === 'image') {
                currentStyle.values.forEach(v => {
                    return new Promise<void>((resolve, reject) => {
                        const imagePath = v.val.toString()
                        const img = new Image();
                            img.onload = () => {
                                console.log(`Afbeelding geladen: ${imagePath}`);
                                cachedImages[imagePath] = img
                                resolve();
                            };
                            img.onerror = (e) => {
                                console.error(`Fout bij laden afbeelding ${imagePath}:`, e);
                                reject(e);
                            };
                            img.src = imagePath;
                    })
                })
            }
        }

        let i = 0
        // Animation loop
        async function update() {
            i++
            const webcamCanvas = webcam.currentImage;
            if (webcamCanvas && ctx) {
                // Update canvas grootte om overeen te komen met video
                if (canvas.width !== webcamCanvas.width || canvas.height !== webcamCanvas.height) {
                    canvas.width = webcamCanvas.width;
                    canvas.height = webcamCanvas.height;
                }

                // Clear vorige frame
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Bereken beweging
                const motionGrid = motionDetection.analyzeFrame(webcamCanvas);
                
                // Teken bewegingsdetectie
                const cellWidth = canvas.width / motionGrid[0].length;
                const cellHeight = canvas.height / motionGrid.length;


                if (currentStyle.type == "image") {
                    for (let y = 0; y < motionGrid.length; y++) {
                        imageGrid[y] = [];
                        
                        for (let x = 0; x < motionGrid[y].length; x++) {
                            let motion = motionGrid[y][x];

                            if (currentStyle.valueRange) {
                                const step = 1 / (currentStyle.valueRange - 1);
                                motion = Math.round(motion / step) * step;
                            }
                            imageGrid[y][x] = motion;
                        }
                    }
                }


                for (let y = 0; y < motionGrid.length; y++) {
                    for (let x = 0; x < motionGrid[y].length; x++) {
                        let motion = motionGrid[y][x];

                        if (currentStyle.valueRange) {
                            const step = 1 / (currentStyle.valueRange - 1);
                            motion = Math.round(motion / step) * step;
                        }

                        let value = currentStyle.values.find(s => (motion >= s.min && motion < s.max) || motion == s.min && motion == s.max)?.val || currentStyle.values[0].val;
                        // if (currentStyle.type == "image") {
                        //     value = imageGrid[y][x].toString()
                        // }


                        if (typeof value == "string") {
                            ctx.fillStyle = value;
                        } else if (typeof value == "number") {
                            ctx.fillStyle = currentStyle.defaultValue || ""
                        }

                        if (currentStyle.type == "rectangle") {
                            ctx.fillRect(
                                x * cellWidth,
                                y * cellHeight,
                                cellWidth,
                                cellHeight
                            );
                        } else if (currentStyle.type == "dot") {
                            ctx.beginPath();
                            let scale = 1

                            if (typeof value == "number") {
                                scale = value
                            }
                            
                            ctx.arc(
                                x * cellWidth + cellWidth / 2,
                                y * cellHeight + cellHeight / 2,
                                Math.min(cellWidth, cellHeight) / 2 * scale,
                                0,
                                2 * Math.PI
                            );
                            ctx.fill();
                        } else if (currentStyle.type == "text") {
                            ctx.font = `${Math.min(cellWidth, cellHeight)}px Arial`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(
                                value.toString(),
                                x * cellWidth + cellWidth / 2,
                                y * cellHeight + cellHeight / 2
                            );
                        } else if (currentStyle.type == "image") {
                            const imagePath = processImageCell(motion, x, y, imageGrid);
                            // console.log(`IMAGEGRID2, ${imageGrid[y][x]}`, imagePath)

                            if (cachedImages[imagePath]) {
                                ctx.drawImage(
                                    cachedImages[imagePath],
                                    x * cellWidth - 0.5,
                                    y * cellHeight - 0.5,
                                    cellWidth + 0.5, 
                                    cellHeight + 0.5
                                );
                            }
                        }
                    }
                }
            }
            requestAnimationFrame(update);
        }

        update();
    } catch (error) {
        console.error('Kon de webcam niet starten:', error);
    }
    function processImageCell(value: number, x: number, y: number, grid: number[][]): string | number {
        const style = styles.find((s: Style) => s.name === optionsService.options.selectedStyle);
        if (style?.type === 'image') {
            const neighbors = {
                t: y > 0 ? grid[y-1][x] : undefined,
                b: y < grid.length-1 ? grid[y+1][x] : undefined,
                l: x > 0 ? grid[y][x-1] : undefined,
                r: x < grid[0].length-1 ? grid[y][x+1] : undefined,
                tl: y > 0 && x > 0 ? grid[y-1][x-1] : undefined,
                tr: y > 0 && x < grid[0].length-1 ? grid[y-1][x+1] : undefined,
                bl: y < grid.length-1 && x > 0 ? grid[y+1][x-1] : undefined,
                br: y < grid.length-1 && x < grid[0].length-1 ? grid[y+1][x+1] : undefined
            };
    
            // console.log(`c: ${value} l: ${neighbors.l} r: ${neighbors.r} | `, style.values[3].if,  JSON.stringify(grid))
            imageLogicService.setCurrentValue(value);
            imageLogicService.setNeighbors(neighbors);
            
            const res = imageLogicService.getImageForValue(style as any);
            return res
        }
        return value;
    }
});

