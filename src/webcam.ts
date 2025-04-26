import { PoseDetectionModel } from './pose-detection'
import { OptionsService } from './options-service'

export class WebcamModel {
    private stream: MediaStream | null = null
    private videoElement: HTMLVideoElement | null = null
    private canvas: HTMLCanvasElement | null = null
    private context: CanvasRenderingContext2D | null = null
    private poseDetection: PoseDetectionModel | null = null
    private animationFrameId: number | null = null
    private optionsService: OptionsService

    constructor(optionsService: OptionsService) {
        this.optionsService = optionsService
        this.videoElement = document.createElement("video")
        this.canvas = document.createElement("canvas")
        this.context = this.canvas.getContext("2d")
    }

    async start(): Promise<void> {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: "user"
                } 
            })
            if (this.videoElement) {
                this.videoElement.srcObject = this.stream
                await this.videoElement.play()
                
                // Initialize pose detection
                this.poseDetection = new PoseDetectionModel(this.videoElement, this.optionsService)
                this.startPoseDetection()
            }
        } catch (error) {
            console.error("Error accessing webcam:", error)
            throw error
        }
    }

    private startPoseDetection() {
        const processFrame = async () => {
            if (this.poseDetection) {
                await this.poseDetection.processFrame()
            }
            this.animationFrameId = requestAnimationFrame(processFrame)
        }
        processFrame()
    }

    stop(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId)
            this.animationFrameId = null
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop())
            this.stream = null
        }
        if (this.videoElement) {
            this.videoElement.pause()
            this.videoElement.srcObject = null
        }
    }

    get currentImage(): HTMLCanvasElement | null {
        if (!this.videoElement || !this.canvas || !this.context) return null

        this.canvas.width = this.videoElement.videoWidth
        this.canvas.height = this.videoElement.videoHeight
        this.context.drawImage(this.videoElement, 0, 0)
        return this.canvas
    }

    get poseCanvas(): HTMLCanvasElement | null {
        return this.poseDetection?.poseCanvas || null
    }

    get poseCanvasBW(): HTMLCanvasElement | null {
        return this.poseDetection?.poseCanvasBW || null
    }
} 