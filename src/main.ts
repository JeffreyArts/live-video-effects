import './vite-env.d.ts';
import { WebcamModel } from './webcam';
import { MotionDetectionService } from './motion-detection';
import { OptionsService } from './options-service';

// Basis setup voor de applicatie
document.addEventListener('DOMContentLoaded', async () => {
    const webcam = new WebcamModel();
    const optionsService = new OptionsService();
    const options = optionsService.getOptions();
    
    const motionDetection = new MotionDetectionService(
        options.gridSize,
        options.bufferSize
    );
    
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
                width: 100vw;
                height: calc(100vw * 9/16);
                max-height: 100vh;
                max-width: calc(100vh * 16/9);
                pointer-events: none;
                object-fit: none;
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
                         ${optionsService.getStyles().map(style => `
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

        gridXInput.addEventListener('input', () => {
            const value = parseInt(gridXInput.value);
            sidebar.querySelector('#gridXValue')!.textContent = value.toString();
            optionsService.setGridSize(value, options.gridSize.y);
            motionDetection['gridSize'].x = value;
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
        });

        // Animation loop
        function update() {
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
                const styles = optionsService.getStyles();
                const currentStyle = styles.find(s => s.name.includes(optionsService.getOptions().selectedStyle)) || styles[0];

                // console.log(styles, optionsService.getOptions().selectedStyle)

                for (let y = 0; y < motionGrid.length; y++) {
                    for (let x = 0; x < motionGrid[y].length; x++) {
                        const motion = motionGrid[y][x];
                        const value = currentStyle.values.find(s => motion >= s.min && motion < s.max)?.val || currentStyle.values[0].val;

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
});
