export class WebcamModel {
    private stream: MediaStream | null = null
    private videoElement: HTMLVideoElement | null = null
    private canvas: HTMLCanvasElement | null = null
    private context: CanvasRenderingContext2D | null = null

    constructor() {
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
            }
        } catch (error) {
            console.error("Error accessing webcam:", error)
            throw error
        }
    }

    stop(): void {
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
} 