import { Pose } from '@mediapipe/pose'
import { OptionsService } from './options-service'

export class PoseDetectionModel {
    private pose: Pose
    private _poseCanvas: HTMLCanvasElement
    private context: CanvasRenderingContext2D
    private videoElement: HTMLVideoElement
    private optionsService: OptionsService
    private _poseCanvasBW: HTMLCanvasElement | null = null
    private _webcamCanvas: HTMLCanvasElement
    private zValueCache: number[] = []
    private readonly CACHE_SIZE = 30
    private maxShoulderDistance: number = 0

    constructor(videoElement: HTMLVideoElement, optionsService: OptionsService) {
        this.videoElement = videoElement
        this.optionsService = optionsService
        this._poseCanvas = document.createElement('canvas')
        this._webcamCanvas = document.createElement('canvas')
        this._webcamCanvas.style.position = 'absolute'
        this._webcamCanvas.style.top = '0'
        this._webcamCanvas.style.left = '0'
        this._webcamCanvas.style.zIndex = '1000'
        this._webcamCanvas.style.width = '100px'
        this._webcamCanvas.style.border = '1px solid red'
        document.body.appendChild(this._webcamCanvas)
        this.context = this._poseCanvas.getContext('2d')!
        
        this.pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
            }
        })

        this.pose.setOptions({
            modelComplexity: 2,
            smoothLandmarks: true,
            enableSegmentation: true,
            smoothSegmentation: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })

        this.pose.onResults(this.onResults.bind(this))
    }

    private getAverageZValue(): number {
        if (this.zValueCache.length === 0) return 0
        const sum = this.zValueCache.reduce((a, b) => a + b, 0)
        return sum / this.zValueCache.length
    }

    private updateZValueCache(results: any) {
        // Verzamel alleen z-waarden van de schouders
        const zValues: number[] = []
        
        // Schouders (index 11 en 12)
        if (results.poseLandmarks[11] && results.poseLandmarks[12]) {
            zValues.push(results.poseLandmarks[11].z)
            zValues.push(results.poseLandmarks[12].z)

            // Bereken de huidige schouderafstand
            const currentShoulderDistance = Math.sqrt(
                Math.pow((results.poseLandmarks[12].x - results.poseLandmarks[11].x) * this._poseCanvas.width, 2) +
                Math.pow((results.poseLandmarks[12].y - results.poseLandmarks[11].y) * this._poseCanvas.height, 2)
            )

            // Update de maximale schouderafstand als de huidige groter is
            this.maxShoulderDistance = Math.max(this.maxShoulderDistance, currentShoulderDistance)
        }

        // Bereken het gemiddelde van de z-waarden
        if (zValues.length > 0) {
            const averageZ = zValues.reduce((a, b) => a + b, 0) / zValues.length
            this.zValueCache.push(averageZ)
            if (this.zValueCache.length > this.CACHE_SIZE) {
                this.zValueCache.shift()
            }
        }
    }

    private onResults(results: any) {
        if (!results.poseLandmarks) return

        // Update canvas size to match video
        this._poseCanvas.width = this.videoElement.videoWidth
        this._poseCanvas.height = this.videoElement.videoHeight
        this._webcamCanvas.width = this.videoElement.videoWidth
        this._webcamCanvas.height = this.videoElement.videoHeight

        // Clear canvas
        this.context.clearRect(0, 0, this._poseCanvas.width, this._poseCanvas.height)

        // If usePoseStream is true, draw the pose detection visualization
        if (this.optionsService.options.usePoseStream || this.optionsService.options.showPose) {
            // Draw pose landmarks
            this.context.strokeStyle = '#00FF00'
            this.context.lineWidth = this.optionsService.options.poseLineThickness

            // Draw connections between landmarks
            const connections = [
                [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
                [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28] // Legs
            ]

            // Draw torso polygon
            const leftShoulder = results.poseLandmarks[11]
            const rightShoulder = results.poseLandmarks[12]
            const leftHip = results.poseLandmarks[23]
            const rightHip = results.poseLandmarks[24]

            if (leftShoulder && rightShoulder && leftHip && rightHip) {
                this.context.fillStyle = '#00FF00'
                this.context.beginPath()
                this.context.moveTo(leftShoulder.x * this._poseCanvas.width, leftShoulder.y * this._poseCanvas.height)
                this.context.lineTo(rightShoulder.x * this._poseCanvas.width, rightShoulder.y * this._poseCanvas.height)
                this.context.lineTo(rightHip.x * this._poseCanvas.width, rightHip.y * this._poseCanvas.height)
                this.context.lineTo(leftHip.x * this._poseCanvas.width, leftHip.y * this._poseCanvas.height)
                this.context.closePath()
                this.context.fill()
            }

            // Teken de basis verbindingen
            connections.forEach(([start, end]) => {
                const startPoint = results.poseLandmarks[start]
                const endPoint = results.poseLandmarks[end]
                
                if (startPoint && endPoint) {
                    this.context.beginPath()
                    this.context.moveTo(startPoint.x * this._poseCanvas.width, startPoint.y * this._poseCanvas.height)
                    this.context.lineTo(endPoint.x * this._poseCanvas.width, endPoint.y * this._poseCanvas.height)
                    this.context.stroke()
                }
            })

            // Teken handlijnen
            const handConnections = [
                { wrist: 15, fingers: [17, 19, 21] }, // Linkerhand
                { wrist: 16, fingers: [18, 20, 22] }  // Rechterhand
            ]

            handConnections.forEach(({ wrist, fingers }) => {
                const wristPoint = results.poseLandmarks[wrist]
                const fingerPoints = fingers.map(f => results.poseLandmarks[f]).filter(Boolean)
                
                if (wristPoint && fingerPoints.length > 0) {
                    // Bereken het middelpunt van de vingers
                    const centerX = fingerPoints.reduce((sum, p) => sum + p.x, 0) / fingerPoints.length
                    const centerY = fingerPoints.reduce((sum, p) => sum + p.y, 0) / fingerPoints.length
                    
                    // Teken lijn van pols naar middelpunt
                    this.context.beginPath()
                    this.context.moveTo(wristPoint.x * this._poseCanvas.width, wristPoint.y * this._poseCanvas.height)
                    this.context.lineTo(centerX * this._poseCanvas.width, centerY * this._poseCanvas.height)
                    this.context.stroke()

                    // Teken rode stip op het middelpunt
                    this.context.fillStyle = '#FF0000'
                    this.context.beginPath()
                    this.context.arc(
                        centerX * this._poseCanvas.width,
                        centerY * this._poseCanvas.height,
                        this.optionsService.options.poseLineThickness/2,
                        0,
                        2 * Math.PI
                    )
                    this.context.fill()
                }
            })

            // Teken rode stippen op alle landmarks (behalve gezicht en handlandmarks)
            this.context.fillStyle = '#FF0000'
            const dotRadius = this.optionsService.options.poseLineThickness/2
            results.poseLandmarks.forEach((landmark: any, index: number) => {
                // Skip gezichtslandmarks (0-10) en handlandmarks (17-22)
                if (landmark && index > 10 && (index < 17 || index > 22)) {
                    this.context.beginPath()
                    this.context.arc(
                        landmark.x * this._poseCanvas.width,
                        landmark.y * this._poseCanvas.height,
                        dotRadius,
                        0,
                        2 * Math.PI
                    )
                    this.context.fill()
                }
            })

            // Draw head using face landmarks for better accuracy
            if (results.faceLandmarks) {
                // Bereken de bounding box van het gezicht
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                
                for (const landmark of results.faceLandmarks) {
                    minX = Math.min(minX, landmark.x * this._poseCanvas.width)
                    minY = Math.min(minY, landmark.y * this._poseCanvas.height)
                    maxX = Math.max(maxX, landmark.x * this._poseCanvas.width)
                    maxY = Math.max(maxY, landmark.y * this._poseCanvas.height)
                }

                // Update z-waarde cache en bereken gemiddelde
                this.updateZValueCache(results)
                const averageZ = this.getAverageZValue()

                // Bereken de basis grootte op basis van de huidige schouderafstand
                const currentShoulderDistance = Math.sqrt(
                    Math.pow((results.poseLandmarks[12].x - results.poseLandmarks[11].x) * this._poseCanvas.width, 2) +
                    Math.pow((results.poseLandmarks[12].y - results.poseLandmarks[11].y) * this._poseCanvas.height, 2)
                )
                
                // Gebruik de huidige schouderafstand als basis, maar schaal direct met de z-waarde
                const baseSize = currentShoulderDistance * 0.3
                const zFactor = Math.abs(averageZ) // Gebruik absolute waarde van z
                const size = baseSize / (zFactor + 0.5) // +0.5 om te voorkomen dat de deler te klein wordt

                // Teken het hoofd als een ovaal in groen
                this.context.fillStyle = '#00FF00'
                this.context.beginPath()
                this.context.ellipse(
                    (minX + maxX) / 2,
                    (minY + maxY) / 2,
                    size / 2,
                    size / 1.5,
                    0,
                    0,
                    2 * Math.PI
                )
                this.context.fill()
            } else {
                // Fallback naar de oude methode als er geen gezichtslandmarks zijn
                const nose = results.poseLandmarks[0]
                const leftEye = results.poseLandmarks[1]
                const rightEye = results.poseLandmarks[2]
                
                if (nose && leftEye && rightEye) {
                    
                    // Update z-waarde cache en bereken gemiddelde
                    this.updateZValueCache(results)
                    const averageZ = this.getAverageZValue()
                    
                    // Zelfde logica voor de fallback methode
                    const currentShoulderDistance = Math.sqrt(
                        Math.pow((results.poseLandmarks[12].x - results.poseLandmarks[11].x) * this._poseCanvas.width, 2) +
                        Math.pow((results.poseLandmarks[12].y - results.poseLandmarks[11].y) * this._poseCanvas.height, 2)
                    )
                    
                    const zFactor = Math.abs(averageZ)
                    const headSize = (currentShoulderDistance * 0.15) / (zFactor + 0.5) * 2
                    
                    // Teken het hoofd in groen
                    this.context.fillStyle = '#00FF00'
                    this.context.beginPath()
                    this.context.arc(
                        nose.x * this._poseCanvas.width,
                        nose.y * this._poseCanvas.height,
                        headSize,
                        0,
                        2 * Math.PI
                    )
                    this.context.fill()
                }
            }

            // Create black and white version
            const bwCanvas = document.createElement('canvas')
            bwCanvas.width = this._poseCanvas.width
            bwCanvas.height = this._poseCanvas.height
            const bwContext = bwCanvas.getContext('2d')!
            
            // Draw the pose in black and white
            bwContext.drawImage(this._poseCanvas, 0, 0)
            const imageData = bwContext.getImageData(0, 0, bwCanvas.width, bwCanvas.height)
            const data = imageData.data

            // Convert to black and white (no grayscale)
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
                const bwValue = avg > 127 ? 255 : 0 // Drempelwaarde voor zwart/wit
                
                data[i] = bwValue // R
                data[i + 1] = bwValue // G
                data[i + 2] = bwValue // B
            }

            bwContext.putImageData(imageData, 0, 0)
            this._poseCanvasBW = bwCanvas

            // Update webcam canvas
            const webcamContext = this._webcamCanvas.getContext('2d')!
            webcamContext.clearRect(0, 0, this._webcamCanvas.width, this._webcamCanvas.height)
            webcamContext.fillStyle = 'white'
            // webcamContext.filter = 'invert(1)'
            webcamContext.fillRect(0, 0, this._webcamCanvas.width, this._webcamCanvas.height)
            webcamContext.drawImage(bwCanvas, 0, 0)

            // Dispatch event with webcam canvas
            const poseEvent = new CustomEvent('poseUpdate', {
                detail: {
                    canvas: this._webcamCanvas
                }
            })
            document.dispatchEvent(poseEvent)
        }
    }

    async processFrame() {
        await this.pose.send({ image: this.videoElement })
    }

    get poseCanvas(): HTMLCanvasElement {
        return this._poseCanvas
    }

    get poseCanvasBW(): HTMLCanvasElement | null {
        return this._poseCanvasBW
    }

    set poseCanvasBW(canvas: HTMLCanvasElement | null) {
        this._poseCanvasBW = canvas
    }
    
    getCanvas(): HTMLCanvasElement {
        return this._webcamCanvas
    }

    get webcamCanvas(): HTMLCanvasElement {
        return this._webcamCanvas
    }
} 