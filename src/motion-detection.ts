import { OptionsService } from './options-service'
import { WebcamModel } from './webcam'
import { PoseDetectionModel } from './pose-detection'

export class MotionDetectionService {
    private optionsService: OptionsService
    private frameBuffer: ImageData[] = []
    private gridSize: { x: number; y: number }
    private bufferSize: number
    public significantChangeTreshold: number
    private currentImage: ImageData | null = null
    private buffer: ImageData[] = []
    private lastProcessedImage: ImageData | null = null

    constructor(optionsService: OptionsService) {
        this.optionsService = optionsService
        this.gridSize = optionsService.options.gridSize
        this.bufferSize = optionsService.options.bufferSize
        this.significantChangeTreshold = optionsService.options.significantChangeThreshold
    }

    public reset(): void {
        this.frameBuffer = []
    }

    public analyzeFrame(canvas: HTMLCanvasElement): number[][] {
        const context = canvas.getContext("2d")
        if (!context) return []

        const currentFrame = context.getImageData(0, 0, canvas.width, canvas.height)
        const motionGrid = this.createEmptyGrid()

        // Voeg het huidige frame toe aan de buffer
        this.frameBuffer.push(currentFrame)
        
        // Verwijder oude frames als de buffer te groot wordt
        if (this.frameBuffer.length > this.bufferSize) {
            this.frameBuffer.shift()
        }

        if (this.significantChangeTreshold <= 0) {
            this.significantChangeTreshold = 1
        }

        // Bereken alleen beweging als we genoeg frames hebben
        if (this.frameBuffer.length >= 2) {
            const cellWidth = canvas.width / this.gridSize.x
            const cellHeight = canvas.height / this.gridSize.y

            for (let y = 0; y < this.gridSize.y; y++) {
                for (let x = 0; x < this.gridSize.x; x++) {
                    // Bereken beweging tussen het huidige frame en het oudste frame in de buffer
                    const motion = this.calculateCellMotion(
                        x, y,
                        cellWidth, cellHeight,
                        this.frameBuffer[this.frameBuffer.length - 1], // Huidige frame
                        this.frameBuffer[0], // Oudste frame in de buffer
                        this.significantChangeTreshold
                    )
                    
                    motionGrid[y][x] = motion
                }
            }
        }

        return motionGrid
    }

    private createEmptyGrid(): number[][] {
        return Array(this.gridSize.y).fill(0).map(() => 
            Array(this.gridSize.x).fill(0)
        )
    }

    private calculateCellMotion(
        x: number, y: number,
        cellWidth: number, cellHeight: number,
        currentFrame: ImageData,
        previousFrame: ImageData,
        significantChangeTreshold = 50
    ): number {
        let totalDiff = 0
        let totalBrightness = 0
        const startX = Math.floor(x * cellWidth)
        const startY = Math.floor(y * cellHeight)
        const endX = Math.min(startX + cellWidth, currentFrame.width)
        const endY = Math.min(startY + cellHeight, currentFrame.height)
        const pixelCount = (endX - startX) * (endY - startY)

        for (let py = startY; py < endY; py++) {
            for (let px = startX; px < endX; px++) {
                const index = (py * currentFrame.width + px) * 4
                
                // Bereken het verschil in helderheid tussen frames
                const currentBrightness = (
                    currentFrame.data[index] +
                    currentFrame.data[index + 1] +
                    currentFrame.data[index + 2]
                ) / 3
                
                const previousBrightness = (
                    previousFrame.data[index] +
                    previousFrame.data[index + 1] +
                    previousFrame.data[index + 2]
                ) / 3
                
                totalDiff += Math.abs(currentBrightness - previousBrightness)
                totalBrightness += currentBrightness
            }
        }

        // Bereken het percentage van pixels dat significant is veranderd
        const significantChanges = totalDiff / significantChangeTreshold
        // Normaliseer naar een waarde tussen 0 en 1, waarbij 1 overeenkomt met alle pixels significant veranderd
        let normalizedValue = significantChanges / pixelCount
        
        // Als onlyMotionDetection false is, neem de helderheid mee
        if (!this.optionsService.options.onlyMotionDetection) {
            const averageBrightness = totalBrightness / (pixelCount * 255) // Normaliseer naar 0-1
            normalizedValue = (normalizedValue + averageBrightness) / 2 // Gemiddelde van beweging en helderheid
        }
        
        // Knip af op 1
        return Math.min(normalizedValue, 1)
    }

    update(webcam: WebcamModel, poseDetection?: PoseDetectionModel): void {
        if (!webcam.currentImage) return

        // If usePoseStream is true, use pose detection results as input
        if (this.optionsService.options.usePoseStream && poseDetection) {
            // Get the pose detection canvas
            const poseCanvas = poseDetection.poseCanvasBW
            if (!poseCanvas) return

            // Create a temporary canvas to draw the pose detection results
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = poseCanvas.width
            tempCanvas.height = poseCanvas.height
            const tempContext = tempCanvas.getContext('2d')
            if (!tempContext) return

            // Draw the pose detection results on the temporary canvas
            tempContext.drawImage(poseCanvas, 0, 0)

            // Get the image data from the temporary canvas
            this.currentImage = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
        } else {
            // Use the webcam image as input
            const canvas = webcam.currentImage
            const context = canvas.getContext('2d')
            if (!context) return
            this.currentImage = context.getImageData(0, 0, canvas.width, canvas.height)
        }

        // Process the image
        this.processImage()
    }

    private processImage(): void {
        if (!this.currentImage) return

        // Add current image to buffer
        this.buffer.push(this.currentImage)
        if (this.buffer.length > this.bufferSize) {
            this.buffer.shift()
        }

        // Calculate average image
        const averageImage = this.calculateAverageImage()
        if (!averageImage) return

        // Calculate difference between current and average image
        const differenceImage = this.calculateDifferenceImage(this.currentImage, averageImage)
        if (!differenceImage) return

        // Process difference image
        this.processDifferenceImage(differenceImage)
    }

    private calculateAverageImage(): ImageData | null {
        if (this.buffer.length === 0) return null

        const firstImage = this.buffer[0]
        const averageImage = new ImageData(firstImage.width, firstImage.height)
        const data = averageImage.data

        // Initialize with zeros
        for (let i = 0; i < data.length; i++) {
            data[i] = 0
        }

        // Sum all images
        for (const image of this.buffer) {
            for (let i = 0; i < image.data.length; i++) {
                data[i] += image.data[i]
            }
        }

        // Calculate average
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.round(data[i] / this.buffer.length)
        }

        return averageImage
    }

    private calculateDifferenceImage(current: ImageData, average: ImageData): ImageData | null {
        if (current.width !== average.width || current.height !== average.height) return null

        const differenceImage = new ImageData(current.width, current.height)
        const data = differenceImage.data

        for (let i = 0; i < current.data.length; i++) {
            data[i] = Math.abs(current.data[i] - average.data[i])
        }

        return differenceImage
    }

    private processDifferenceImage(differenceImage: ImageData): void {
        // Store the processed image for later use
        this.lastProcessedImage = differenceImage
    }

    get processedImage(): ImageData | null {
        return this.lastProcessedImage
    }
} 