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
        const cellWidth = canvas.width / this.gridSize.x
        const cellHeight = canvas.height / this.gridSize.y

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
    

    get processedImage(): ImageData | null {
        return this.lastProcessedImage
    }
} 