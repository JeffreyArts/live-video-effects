import { Pose } from '@mediapipe/pose'
import { OptionsService } from './options-service'

export class PoseDetectionModel {
    private pose: Pose
    private canvas: HTMLCanvasElement
    private context: CanvasRenderingContext2D
    private videoElement: HTMLVideoElement
    private optionsService: OptionsService
    private _poseCanvasBW: HTMLCanvasElement | null = null
    private zValueCache: number[] = []
    private readonly CACHE_SIZE = 30
    private maxShoulderDistance: number = 0

    constructor(videoElement: HTMLVideoElement, optionsService: OptionsService) {
        this.videoElement = videoElement
        this.optionsService = optionsService
        this.canvas = document.createElement('canvas')
        this.context = this.canvas.getContext('2d')!
        
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
                Math.pow((results.poseLandmarks[12].x - results.poseLandmarks[11].x) * this.canvas.width, 2) +
                Math.pow((results.poseLandmarks[12].y - results.poseLandmarks[11].y) * this.canvas.height, 2)
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
        this.canvas.width = this.videoElement.videoWidth
        this.canvas.height = this.videoElement.videoHeight

        // Clear canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)

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
                this.context.moveTo(leftShoulder.x * this.canvas.width, leftShoulder.y * this.canvas.height)
                this.context.lineTo(rightShoulder.x * this.canvas.width, rightShoulder.y * this.canvas.height)
                this.context.lineTo(rightHip.x * this.canvas.width, rightHip.y * this.canvas.height)
                this.context.lineTo(leftHip.x * this.canvas.width, leftHip.y * this.canvas.height)
                this.context.closePath()
                this.context.fill()
            }

            // Teken de basis verbindingen
            connections.forEach(([start, end]) => {
                const startPoint = results.poseLandmarks[start]
                const endPoint = results.poseLandmarks[end]
                
                if (startPoint && endPoint) {
                    this.context.beginPath()
                    this.context.moveTo(startPoint.x * this.canvas.width, startPoint.y * this.canvas.height)
                    this.context.lineTo(endPoint.x * this.canvas.width, endPoint.y * this.canvas.height)
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
                    this.context.moveTo(wristPoint.x * this.canvas.width, wristPoint.y * this.canvas.height)
                    this.context.lineTo(centerX * this.canvas.width, centerY * this.canvas.height)
                    this.context.stroke()

                    // Teken rode stip op het middelpunt
                    this.context.fillStyle = '#FF0000'
                    this.context.beginPath()
                    this.context.arc(
                        centerX * this.canvas.width,
                        centerY * this.canvas.height,
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
                        landmark.x * this.canvas.width,
                        landmark.y * this.canvas.height,
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
                    minX = Math.min(minX, landmark.x * this.canvas.width)
                    minY = Math.min(minY, landmark.y * this.canvas.height)
                    maxX = Math.max(maxX, landmark.x * this.canvas.width)
                    maxY = Math.max(maxY, landmark.y * this.canvas.height)
                }

                // Update z-waarde cache en bereken gemiddelde
                this.updateZValueCache(results)
                const averageZ = this.getAverageZValue()

                // Bereken de basis grootte op basis van de huidige schouderafstand
                const currentShoulderDistance = Math.sqrt(
                    Math.pow((results.poseLandmarks[12].x - results.poseLandmarks[11].x) * this.canvas.width, 2) +
                    Math.pow((results.poseLandmarks[12].y - results.poseLandmarks[11].y) * this.canvas.height, 2)
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
                        Math.pow((results.poseLandmarks[12].x - results.poseLandmarks[11].x) * this.canvas.width, 2) +
                        Math.pow((results.poseLandmarks[12].y - results.poseLandmarks[11].y) * this.canvas.height, 2)
                    )
                    
                    const zFactor = Math.abs(averageZ)
                    const headSize = (currentShoulderDistance * 0.15) / (zFactor + 0.5) * 2
                    
                    // Teken het hoofd in groen
                    this.context.fillStyle = '#00FF00'
                    this.context.beginPath()
                    this.context.arc(
                        nose.x * this.canvas.width,
                        nose.y * this.canvas.height,
                        headSize,
                        0,
                        2 * Math.PI
                    )
                    this.context.fill()
                }
            }

            // Create black and white version
            const bwCanvas = document.createElement('canvas')
            bwCanvas.width = this.canvas.width
            bwCanvas.height = this.canvas.height
            const bwContext = bwCanvas.getContext('2d')!
            
            // Draw the pose in black and white
            bwContext.drawImage(this.canvas, 0, 0)
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

            // Maak een temp canvas en teken de zwart-witte canvas op deze canvas met een witte achtergrond
            
            let tempCanvas = document.body.querySelector('#tempCanvas') as HTMLCanvasElement
            if (!tempCanvas) {
                tempCanvas = document.createElement('canvas')
                document.body.appendChild(tempCanvas)
            }

            tempCanvas.id = 'tempCanvas'
            tempCanvas.width = this.canvas.width
            tempCanvas.height = this.canvas.height
            tempCanvas.style.position = 'absolute'
            tempCanvas.style.top = '0'
            tempCanvas.style.left = '0'
            tempCanvas.style.zIndex = '1000'
            tempCanvas.style.width = '100px'
            tempCanvas.style.border = '1px solid red'
            const tempContext = tempCanvas.getContext('2d')!

            tempContext.fillStyle = 'white'
            tempContext.filter = 'invert(1)'
            tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
            tempContext.drawImage(bwCanvas, 0, 0)
            // Invert colors


            // Alleen emitten als het canvas beschikbaar is
            if (tempCanvas) {
                const poseEvent = new CustomEvent('poseUpdate', {
                    detail: {
                        canvas: tempCanvas
                    }
                })
                document.dispatchEvent(poseEvent)
            }
        }
    }

    async processFrame() {
        await this.pose.send({ image: this.videoElement })
    }

    get poseCanvas(): HTMLCanvasElement {
        return this.canvas
    }

    get poseCanvasBW(): HTMLCanvasElement | null {
        return this._poseCanvasBW
    }

    set poseCanvasBW(canvas: HTMLCanvasElement | null) {
        this._poseCanvasBW = canvas
    }
    
    getCanvas(): HTMLCanvasElement {
        return this.canvas
    }
} 