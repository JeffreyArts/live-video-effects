import "./vite-env.d.ts"
import { WebcamModel } from "./webcam"
import { MotionDetectionService } from "./motion-detection"
import { OptionsService, VideoEffect, VideoEffectValue } from "./options-service"
import { ImageLogicService } from "./image-logic-service"
import { iconsMap } from "jao-icons"


// Basis setup voor de applicatie
const optionsService = new OptionsService()
const webcam = new WebcamModel(optionsService)
const motionDetection = new MotionDetectionService(optionsService)
const imageLogicService = ImageLogicService.getInstance()

document.addEventListener("DOMContentLoaded", async () => {
    const options = optionsService.options
    
    try {
        // Wacht tot de video effecten zijn geladen
        await optionsService.waitForVideoEffects()

        // Voeg het wrench icon toe aan de toggle button
        const toggleButton = document.getElementById("toggleButton")
        if (toggleButton) {
            const wrenchData = iconsMap.large.wrench
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
            svg.setAttribute("width", "48")
            svg.setAttribute("height", "48")
            
            // Bereken de totale grootte inclusief beide borders
            const totalWidth = wrenchData[0].length + 2 // +2 voor beide borders
            const totalHeight = wrenchData.length + 2 // +2 voor beide borders
            
            // Pas de viewBox aan voor de grotere rects en borders
            svg.setAttribute("viewBox", `0 0 ${totalWidth * 5} ${totalHeight * 5}`)
            
            // Loop door het hele grid
            for (let y = 0; y < totalHeight; y++) {
                for (let x = 0; x < totalWidth; x++) {
                    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
                    rect.setAttribute("x", (x * 5).toString())
                    rect.setAttribute("y", (y * 5).toString())
                    rect.setAttribute("width", "4")
                    rect.setAttribute("height", "4")
                    rect.setAttribute("class", "jao-icon-cell")
                    
                    // Bepaal de v-waarde op basis van de positie
                    if (x === 0 || x === totalWidth - 1 || y === 0 || y === totalHeight - 1) {
                        // Buitenste border (zwart)
                        rect.setAttribute("v", "1")
                    } else if (x === 1 || x === totalWidth - 2 || y === 1 || y === totalHeight - 2) {
                        // Binnenste border (wit)
                        rect.setAttribute("v", "0")
                    } else {
                        // Originele wrench data
                        const wrenchX = x - 1
                        const wrenchY = y - 1
                        rect.setAttribute("v", wrenchData[wrenchY][wrenchX].toString())
                    }
                    
                    svg.appendChild(rect)
                }
            }
            
            toggleButton.appendChild(svg)
        }

        // Voeg click event listener toe voor het sluiten van de sidebar
        document.addEventListener("click", (event) => {
            const sidebar = document.querySelector(".sidebar") as HTMLDivElement
            const toggleButton = document.querySelector(".toggle-button") as HTMLButtonElement
            
            // Controleer of de klik buiten de sidebar en toggle button was
            if (!sidebar.contains(event.target as Node) && !toggleButton.contains(event.target as Node)) {
                sidebar.classList.remove("open")
            }
        })

        await webcam.start()
        
        // Haal het video element uit de HTML
        const videoElement = document.querySelector("#webcam") as HTMLVideoElement
        if (videoElement) {
            videoElement.srcObject = webcam["stream"]
            videoElement.style.display = options.showVideo ? "block" : "none"
        }

        // Maak een canvas voor de bewegingsvisualisatie
        const canvas = document.querySelector("#outputResult") as HTMLCanvasElement
        const ctx = canvas.getContext("2d")!

        // Haal het pose canvas op
        const poseCanvas = document.querySelector("#poseCanvas") as HTMLCanvasElement
        const poseCanvasBW = document.querySelector("#poseCanvasBW") as HTMLCanvasElement
        const poseCtx = poseCanvas.getContext("2d")!
        const poseCtxBW = poseCanvasBW.getContext("2d")!

        // Bereken eerst alle afbeeldingen
        const imageGrid: (number)[][] = []
        const cachedImages: { [key: string]: HTMLImageElement } = {}
        loadImages()

        function updateCanvasSize() {
            const videoElement = document.querySelector("#webcam") as HTMLVideoElement
            if (!videoElement || !ctx || !poseCtx || !poseCtxBW) return

            // Wacht tot de video dimensies beschikbaar zijn
            if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) return

            const windowAspectRatio = window.innerWidth / window.innerHeight
            const videoAspectRatio = videoElement.videoWidth / videoElement.videoHeight
            
            let canvasWidth, canvasHeight
            
            if (windowAspectRatio > videoAspectRatio) {
                // Landscape: fit to height
                canvasHeight = window.innerHeight
                canvasWidth = canvasHeight * videoAspectRatio
            } else {
                // Portrait: fit to width
                canvasWidth = window.innerWidth
                canvasHeight = canvasWidth / videoAspectRatio
            }

            // Update zowel de canvas resolutie als de CSS dimensies
            canvas.width = canvasWidth
            canvas.height = canvasHeight
            canvas.style.width = `${canvasWidth}px`
            canvas.style.height = `${canvasHeight}px`

            poseCanvas.width = canvasWidth
            poseCanvas.height = canvasHeight
            poseCanvas.style.width = `${canvasWidth}px`
            poseCanvas.style.height = `${canvasHeight}px`

            poseCanvasBW.width = canvasWidth
            poseCanvasBW.height = canvasHeight
            poseCanvasBW.style.width = `${canvasWidth}px`
            poseCanvasBW.style.height = `${canvasHeight}px`
        }

        // Voeg resize event listener toe
        window.addEventListener("resize", updateCanvasSize)

        // Voeg ook een event listener toe voor wanneer de video dimensies beschikbaar komen
        if (videoElement) {
            videoElement.addEventListener("loadedmetadata", updateCanvasSize)
        }

        // Initiële canvas size update
        updateCanvasSize()

        // Initialiseer de event listeners voor de opties
        optionsService.initializeEventListeners(motionDetection, videoElement || undefined)

        async function loadImages() {
            await optionsService.waitForVideoEffects()
            if (optionsService.currentVideoEffect?.type === "image") {
                const promises = optionsService.currentVideoEffect.values.map((v: VideoEffectValue) => {
                    return new Promise<void>((resolve, reject) => {
                        const img = new Image()
                        img.onload = () => {
                            cachedImages[v.val.toString()] = img
                            resolve()
                        }
                        img.onerror = () => {
                            console.error(`Kon afbeelding niet laden: ${v.val}`)
                            reject()
                        }
                        img.src = v.val.toString()
                    })
                })
                await Promise.all(promises)
            }
        }
        const videoEffectSelect = document.querySelector("#videoEffectSelect") as HTMLSelectElement
        videoEffectSelect.addEventListener("change", async () => {
            await loadImages()
        })

        // Animation loop
        async function update() {
            await optionsService.waitForVideoEffects()
            const sourceCanvas = optionsService.options.usePoseStream ? webcam.webcamCanvas : webcam.currentImage
            if (sourceCanvas && ctx) {
                // Update canvas grootte om overeen te komen met video
                if (canvas.width !== sourceCanvas.width || canvas.height !== sourceCanvas.height) {
                    canvas.width = sourceCanvas.width
                    canvas.height = sourceCanvas.height
                    poseCanvas.width = sourceCanvas.width
                    poseCanvas.height = sourceCanvas.height
                    poseCanvasBW.width = sourceCanvas.width
                    poseCanvasBW.height = sourceCanvas.height
                }

                // Clear vorige frame
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                poseCtx.clearRect(0, 0, poseCanvas.width, poseCanvas.height)
                poseCtxBW.clearRect(0, 0, poseCanvasBW.width, poseCanvasBW.height)

                // Bereken beweging
                const motionGrid = motionDetection.analyzeFrame(sourceCanvas)
                
                // Teken bewegingsdetectie
                const cellWidth = canvas.width / motionGrid[0].length
                const cellHeight = canvas.height / motionGrid.length

                // Update pose detection canvas
                const poseCanvasData = webcam.poseCanvas
                if (poseCanvasData && options.showPose) {
                    poseCtx.drawImage(poseCanvasData, 0, 0)
                }

                // Update zwart-witte pose detection canvas
                const poseCanvasBWData = webcam.poseCanvasBW
                if (poseCanvasBWData && options.showPoseBW) {
                    poseCtxBW.drawImage(poseCanvasBWData, 0, 0)
                }
                if (optionsService.currentVideoEffect.type == "image") {
                    for (let y = 0; y < motionGrid.length; y++) {
                        imageGrid[y] = []
                        
                        for (let x = 0; x < motionGrid[y].length; x++) {
                            let motion = motionGrid[y][x]
                            
                            // console.log(optionsService.currentVideoEffect)
                            if (optionsService.currentVideoEffect.valueRange) {
                                const step = 1 / (optionsService.currentVideoEffect.valueRange - 1)
                                motion = Math.round(motion / step) * step
                            }
                            imageGrid[y][x] = motion
                        }
                    }
                }


                for (let y = 0; y < motionGrid.length; y++) {
                    for (let x = 0; x < motionGrid[y].length; x++) {
                        let motion = motionGrid[y][x]

                        if (optionsService.currentVideoEffect.valueRange) {
                            const step = 1 / (optionsService.currentVideoEffect.valueRange - 1)
                            motion = Math.round(motion / step) * step
                        }

                        // Debug logging
                        if (isNaN(motion)) {
                            console.warn(`Ongeldige motion waarde gevonden: ${motion}. Originele waarde: ${motionGrid[y][x]}, valueRange: ${optionsService.currentVideoEffect.valueRange}`)
                            motion = 0 // Reset naar 0 als fallback
                        }

                        const value = optionsService.currentVideoEffect.values.find((s: VideoEffectValue) => {
                            // Als min en max gelijk zijn, dan is het een exacte match
                            if (s.min === s.max) {
                                return motion === s.min
                            }
                            // Anders kijken we of de waarde binnen het bereik valt
                            return motion >= s.min! && motion <= s.max!
                        })?.val || optionsService.currentVideoEffect.values[0].val

                        if (typeof value === "undefined") {
                            console.warn(`Geen waarde gevonden voor motion: ${motion}. Gebruik fallback waarde.`)
                            ctx.fillStyle = optionsService.currentVideoEffect.defaultValue || "black"
                        } else if (typeof value == "string") {
                            ctx.fillStyle = value
                        } else if (typeof value == "number") {
                            ctx.fillStyle = optionsService.currentVideoEffect.defaultValue || "black"
                        }

                        if (optionsService.currentVideoEffect.type == "rectangle") {
                            ctx.fillRect(
                                x * cellWidth - .5,
                                y * cellHeight - .5,
                                cellWidth + .5,
                                cellHeight + .5
                            )
                        } else if (optionsService.currentVideoEffect.type == "dot") {
                            ctx.beginPath()
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
                            )
                            ctx.fill()
                        } else if (optionsService.currentVideoEffect.type == "text") {
                            ctx.font = `${Math.min(cellWidth, cellHeight)}px Arial`
                            ctx.textAlign = "center"
                            ctx.textBaseline = "middle"
                            // const tmp = (Math.round(motion*10)/ 10).toString()
                            ctx.fillText(
                                value.toString(),
                                x * cellWidth + cellWidth / 2,
                                y * cellHeight + cellHeight / 2
                            )
                        } else if (optionsService.currentVideoEffect.type == "image") {
                            const imagePath = processImageCell(motion, x, y, imageGrid)

                            if (cachedImages[imagePath]) {
                                ctx.drawImage(
                                    cachedImages[imagePath],
                                    x * cellWidth - 0.5,
                                    y * cellHeight - 0.5,
                                    cellWidth + 0.5, 
                                    cellHeight + 0.5
                                )
                            }
                        }
                    }
                }
            }
            requestAnimationFrame(update)
        }

        update()

    } catch (error) {
        console.error("Kon de webcam niet starten:", error)
    }
    function processImageCell(value: number, x: number, y: number, grid: number[][]): string | number {
        const videoEffect = optionsService.videoEffects.find((s: VideoEffect) => s.name === optionsService.options.selectedVideoEffect)
        if (videoEffect?.type === "image") {
            const neighbors = {
                t: y > 0 ? grid[y-1][x] : undefined,
                r: x < grid[y].length - 1 ? grid[y][x+1] : undefined,
                b: y < grid.length - 1 ? grid[y+1][x] : undefined,
                l: x > 0 ? grid[y][x-1] : undefined,
                tr: y > 0 && x < grid[y].length - 1 ? grid[y-1][x+1] : undefined,
                br: y < grid.length - 1 && x < grid[y].length - 1 ? grid[y+1][x+1] : undefined,
                bl: y < grid.length - 1 && x > 0 ? grid[y+1][x-1] : undefined,
                tl: y > 0 && x > 0 ? grid[y-1][x-1] : undefined,
                c: value
            }

            imageLogicService.setCurrentValue(value)
            imageLogicService.setNeighbors(neighbors)
            
            const res = imageLogicService.getImageForValue(videoEffect)
            return res
        }
        return value
    }

    // Check if we're in dev mode
    if (window.location.search.includes("?dev")) {
        document.body.classList.add("dev")
    }
})

