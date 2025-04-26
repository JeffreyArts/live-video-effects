import { Pose } from '@mediapipe/pose'
import { OptionsService } from './options-service'

export class PoseDetectionModel {
    private pose: Pose
    private canvas: HTMLCanvasElement
    private context: CanvasRenderingContext2D
    private videoElement: HTMLVideoElement
    private optionsService: OptionsService

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
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: true,
            smoothSegmentation: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })

        this.pose.onResults(this.onResults.bind(this))
    }

    private onResults(results: any) {
        if (!results.poseLandmarks) return

        // Update canvas size to match video
        this.canvas.width = this.videoElement.videoWidth
        this.canvas.height = this.videoElement.videoHeight

        // Clear canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // If usePoseStream is true, draw the pose detection visualization
        if (this.optionsService.options.usePoseStream) {
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

            // Draw head as a large circle at nose position
            const nose = results.poseLandmarks[0] // Landmark 0 is the nose
            const leftEye = results.poseLandmarks[1] // Landmark 1 is left eye
            const rightEye = results.poseLandmarks[2] // Landmark 2 is right eye
            
            if (nose && leftEye && rightEye) {
                // Calculate distance between eyes
                const eyeDistance = Math.sqrt(
                    Math.pow((rightEye.x - leftEye.x) * this.canvas.width, 2) +
                    Math.pow((rightEye.y - leftEye.y) * this.canvas.height, 2)
                )
                
                // Draw line from shoulders to nose
                const leftShoulder = results.poseLandmarks[11]
                const rightShoulder = results.poseLandmarks[12]
                
                if (leftShoulder && rightShoulder) {
                    // Calculate midpoint between shoulders
                    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
                    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
                    
                    // Draw line from shoulder midpoint to nose
                    this.context.beginPath()
                    this.context.moveTo(shoulderMidX * this.canvas.width, shoulderMidY * this.canvas.height)
                    this.context.lineTo(nose.x * this.canvas.width, nose.y * this.canvas.height)
                    this.context.stroke()
                }
                
                // Draw large circle at nose position with size relative to eye distance
                this.context.fillStyle = '#FF0000'
                const headSize = (eyeDistance * 0.6) * (this.optionsService.options.poseLineThickness / 2)
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

            // Draw other landmarks (excluding head landmarks)
            this.context.fillStyle = '#FF0000'
            const dotSize = this.optionsService.options.poseLineThickness * 0.6
            // Skip head landmarks (0-10) and only draw body landmarks
            for (let i = 11; i < results.poseLandmarks.length; i++) {
                const landmark = results.poseLandmarks[i]
                this.context.beginPath()
                this.context.arc(
                    landmark.x * this.canvas.width,
                    landmark.y * this.canvas.height,
                    dotSize,
                    0,
                    2 * Math.PI
                )
                this.context.fill()
            }
        }
        // If showPose is true, draw the pose on top of the video
        else if (this.optionsService.options.showPose) {
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

            // Draw head as a large circle at nose position
            const nose = results.poseLandmarks[0] // Landmark 0 is the nose
            const leftEye = results.poseLandmarks[1] // Landmark 1 is left eye
            const rightEye = results.poseLandmarks[2] // Landmark 2 is right eye
            
            if (nose && leftEye && rightEye) {
                // Calculate distance between eyes
                const eyeDistance = Math.sqrt(
                    Math.pow((rightEye.x - leftEye.x) * this.canvas.width, 2) +
                    Math.pow((rightEye.y - leftEye.y) * this.canvas.height, 2)
                )
                
                // Draw line from shoulders to nose
                const leftShoulder = results.poseLandmarks[11]
                const rightShoulder = results.poseLandmarks[12]
                
                if (leftShoulder && rightShoulder) {
                    // Calculate midpoint between shoulders
                    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
                    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
                    
                    // Draw line from shoulder midpoint to nose
                    this.context.beginPath()
                    this.context.moveTo(shoulderMidX * this.canvas.width, shoulderMidY * this.canvas.height)
                    this.context.lineTo(nose.x * this.canvas.width, nose.y * this.canvas.height)
                    this.context.stroke()
                }
                
                // Draw large circle at nose position with size relative to eye distance
                this.context.fillStyle = '#FF0000'
                const headSize = (eyeDistance * 0.6) * (this.optionsService.options.poseLineThickness / 2)
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

            // Draw other landmarks (excluding head landmarks)
            this.context.fillStyle = '#FF0000'
            const dotSize = this.optionsService.options.poseLineThickness * 0.6
            // Skip head landmarks (0-10) and only draw body landmarks
            for (let i = 11; i < results.poseLandmarks.length; i++) {
                const landmark = results.poseLandmarks[i]
                this.context.beginPath()
                this.context.arc(
                    landmark.x * this.canvas.width,
                    landmark.y * this.canvas.height,
                    dotSize,
                    0,
                    2 * Math.PI
                )
                this.context.fill()
            }
        }
    }

    async processFrame() {
        await this.pose.send({ image: this.videoElement })
    }

    get poseCanvas(): HTMLCanvasElement {
        return this.canvas
    }

    get poseCanvasBW(): HTMLCanvasElement {
        return this.pixelationRenderer.canvas
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas
    }
} 