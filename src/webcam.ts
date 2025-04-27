import { PoseDetectionModel } from "./pose-detection"
import { OptionsService } from "./options-service"

export class WebcamModel {
    private stream: MediaStream | null = null
    private videoElement: HTMLVideoElement | null = null
    private canvas: HTMLCanvasElement | null = null
    private context: CanvasRenderingContext2D | null = null
    private poseDetection: PoseDetectionModel | null = null
    private animationFrameId: number | null = null
    private optionsService: OptionsService
    private isPoseDetectionInitialized: boolean = false
    private availableDevices: MediaDeviceInfo[] = []
    private selectedDeviceId: string | null = null

    constructor(optionsService: OptionsService) {
        this.optionsService = optionsService
        this.videoElement = document.createElement("video")
        this.canvas = document.createElement("canvas")
        this.context = this.canvas.getContext("2d")
        this.initializeDeviceSelection()
    }

    private async initializeDeviceSelection() {
        try {
            // Vraag eerst toestemming voor camera toegang
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            stream.getTracks().forEach(track => track.stop())
            
            const devices = await navigator.mediaDevices.enumerateDevices()
            this.availableDevices = devices.filter(device => device.kind === "videoinput")
            
            // Laad opgeslagen device ID uit localStorage
            const savedDeviceId = localStorage.getItem("selectedCameraId")
            
            // Update de camera select dropdown
            const cameraSelect = document.getElementById("cameraSelect") as HTMLSelectElement
            if (cameraSelect) {
                cameraSelect.innerHTML = this.availableDevices.map(device => 
                    `<option value="${device.deviceId}">${device.label || `Camera ${device.deviceId}`}</option>`
                ).join("")
                
                // Selecteer de opgeslagen camera of de eerste beschikbare
                if (savedDeviceId && this.availableDevices.some(device => device.deviceId === savedDeviceId)) {
                    this.selectedDeviceId = savedDeviceId
                    cameraSelect.value = savedDeviceId
                } else if (this.availableDevices.length > 0) {
                    this.selectedDeviceId = this.availableDevices[0].deviceId
                    cameraSelect.value = this.selectedDeviceId
                    localStorage.setItem("selectedCameraId", this.selectedDeviceId)
                }

                // Voeg event listener toe voor camera wisseling
                cameraSelect.addEventListener("change", async (e) => {
                    const target = e.target as HTMLSelectElement
                    this.selectedDeviceId = target.value
                    localStorage.setItem("selectedCameraId", this.selectedDeviceId)
                    await this.restart()
                    // Ververs de pagina na het wisselen van camera
                    window.location.reload()
                })
            }
        } catch (error) {
            console.error("Error initializing device selection:", error)
        }
    }

    async start(): Promise<void> {
        try {
            // Laad de opgeslagen camera ID
            const savedDeviceId = localStorage.getItem("selectedCameraId")
            if (savedDeviceId) {
                this.selectedDeviceId = savedDeviceId
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined
                }
            }

            this.stream = await navigator.mediaDevices.getUserMedia(constraints)
            
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

    private async restart(): Promise<void> {
        this.stop()
        await this.start()
    }

    private startPoseDetection() {
        const processFrame = async () => {
            if (this.poseDetection) {
                await this.poseDetection.processFrame()
            }
            if (!this.isPoseDetectionInitialized) {
                this.isPoseDetectionInitialized = true
                const poseDetectionInitializedEvent = new CustomEvent("poseDetectionInitialized")
                document.dispatchEvent(poseDetectionInitializedEvent)
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
    get webcamCanvas(): HTMLCanvasElement | null {
        return this.poseDetection?.webcamCanvas || null
    }
} 