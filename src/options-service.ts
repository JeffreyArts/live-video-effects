import { MotionDetectionService } from "./motion-detection"

export type VideoEffectType = "rectangle" | "dot" | "image" | "text"

export interface VideoEffectValue {
    min?: number;
    max?: number;
    val: string | number;
    if?: string;
    size?: number;
}

export interface VideoEffect {
    name: string;
    defaultColor?: string
    valueRange?: number
    type: VideoEffectType;
    values: VideoEffectValue[];
}

export interface Options {
    showVideo: boolean
    showPose: boolean
    showPoseBW: boolean
    usePoseStream: boolean
    poseLineThickness: number
    gridSize: { x: number; y: number }
    bufferSize: number
    significantChangeThreshold: number
    selectedVideoEffect: string
    threshold: number
    visualizationType: "grid" | "heatmap" | "contour"
    onlyMotionDetection: boolean
}

const STORAGE_KEY = "webcam-options"

const defaultOptions: Options = {
    showVideo: true,
    showPose: false,
    showPoseBW: false,
    usePoseStream: false,
    poseLineThickness: 128,
    gridSize: { x: 40, y: 40 },
    bufferSize: 1,
    significantChangeThreshold: 32,
    selectedVideoEffect: "Zwarte blokken",
    threshold: 30,
    visualizationType: "grid",
    onlyMotionDetection: false
}

// Functie om video effects automatisch in te laden
async function loadVideoEffects(): Promise<VideoEffect[]> {
    const videoEffects: VideoEffect[] = []
    try {
        // Importeer alle JSON bestanden uit de video-effects map
        const videoEffectModules = import.meta.glob("./video-effects/*.json")
        
        for (const path in videoEffectModules) {
            const module = await videoEffectModules[path]() as { default: VideoEffect }
            videoEffects.push(module.default)
        }
    } catch (error) {
        console.error("Kon video effects niet laden:", error)
    }
    return videoEffects
}

export class OptionsService {
    private _options: Options
    private _videoEffects: VideoEffect[] = []
    private _currentVideoEffect: VideoEffect
    private _motionDetection?: MotionDetectionService
    private _videoElement?: HTMLVideoElement
    private _videoEffectsLoaded: Promise<void>

    constructor() {
        // Bereken de grid grootte op basis van de schermresolutie
        const minDimension = Math.min(window.innerWidth, window.innerHeight)
        const gridSize = Math.floor(minDimension / 40) // 40 vakjes over de smalste zijde
        defaultOptions.gridSize = { x: gridSize, y: gridSize }

        this._options = this.loadOptions()
        this._currentVideoEffect = { name: "Default", type: "rectangle", values: [] }
        
        // Laad video effects asynchroon
        this._videoEffectsLoaded = this.loadVideoEffectsAsync()
    }

    private async loadVideoEffectsAsync() {
        this._videoEffects = await loadVideoEffects()
        this._currentVideoEffect = this.getVideoEffectByName(this._options.selectedVideoEffect) || this._videoEffects[0]
    }

    public async waitForVideoEffects(): Promise<void> {
        await this._videoEffectsLoaded
    }

    private loadOptions(): Options {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const loadedOptions = JSON.parse(stored)
                // Zorg ervoor dat de grid grootte altijd minimaal 1 is
                if (loadedOptions.gridSize) {
                    loadedOptions.gridSize.x = Math.max(1, Math.floor(loadedOptions.gridSize.x))
                    loadedOptions.gridSize.y = Math.max(1, Math.floor(loadedOptions.gridSize.y))
                }
                return { ...defaultOptions, ...loadedOptions }
            }
        } catch (error) {
            console.error("Kon opgeslagen opties niet laden:", error)
        }
        return defaultOptions
    }

    private saveOptions(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._options))
        } catch (error) {
            console.error("Kon opties niet opslaan:", error)
        }
    }

    get options(): Options {
        return this._options
    }

    get videoEffects(): VideoEffect[] {
        return this._videoEffects
    }

    get currentVideoEffect(): VideoEffect {
        return this._currentVideoEffect
    }

    setSelectedVideoEffect(value: string): void {
        this._options.selectedVideoEffect = value
        this._currentVideoEffect = this.getVideoEffectByName(value) || this._videoEffects[0]
        this.saveOptions()
        
        if (this._motionDetection) {
            this.applyOptions(this._motionDetection, this._videoElement)
        }
    }

    setShowVideo(value: boolean): void {
        this._options.showVideo = value
        this.saveOptions()
        if (this._videoElement) {
            this._videoElement.style.display = value ? "block" : "none"
        }
    }

    setShowPose(value: boolean): void {
        this._options.showPose = value
        this.saveOptions()
        if (this._videoElement) {
            const poseCanvas = document.getElementById("poseCanvas") as HTMLCanvasElement
            if (poseCanvas) {
                poseCanvas.style.display = value ? "block" : "none"
            }
        }
    }

    setShowPoseBW(value: boolean): void {
        this._options.showPoseBW = value
        this.saveOptions()
        if (this._videoElement) {
            const poseCanvasBW = document.getElementById("poseCanvasBW") as HTMLCanvasElement
            if (poseCanvasBW) {
                poseCanvasBW.style.display = value ? "block" : "none"
            }
        }
    }

    setBufferSize(value: number): void {
        this._options.bufferSize = value
        this.saveOptions()
        if (this._motionDetection) {
            this._motionDetection["bufferSize"] = value
            this._motionDetection["reset"]()
        }

        // Als buffer size 1 of lager is, schakel onlyMotionDetection uit
        if (value <= 1) {
            this.setOnlyMotionDetection(false)
            // Update de UI
            const onlyMotionDetectionCheckbox = document.getElementById("onlyMotionDetection") as HTMLInputElement
            if (onlyMotionDetectionCheckbox) {
                onlyMotionDetectionCheckbox.checked = false
                onlyMotionDetectionCheckbox.disabled = true
            }
        } else {
            // Herstel de checkbox state
            const onlyMotionDetectionCheckbox = document.getElementById("onlyMotionDetection") as HTMLInputElement
            if (onlyMotionDetectionCheckbox) {
                onlyMotionDetectionCheckbox.disabled = false
            }
        }
    }

    setSignificantChangeThreshold(value: number): void {
        this._options.significantChangeThreshold = value
        this.saveOptions()
        if (this._motionDetection) {
            this._motionDetection["significantChangeTreshold"] = value
        }
    }


    setUsePoseStream(value: boolean): void {
        this._options.usePoseStream = value
        this.saveOptions()
    }

    setVisualizationType(value: "grid" | "heatmap" | "contour"): void {
        this._options.visualizationType = value
        this.saveOptions()
    }

    setThreshold(value: number): void {
        this._options.threshold = value
        this.saveOptions()
    }

    setGridSize(x: number, y: number): void {
        // Zorg ervoor dat x en y minimaal 1 zijn
        x = Math.max(1, Math.floor(x))
        y = Math.max(1, Math.floor(y))
        this._options.gridSize = { x, y }
        this.saveOptions()
        if (this._motionDetection) {
            this._motionDetection["gridSize"] = { x, y }
        }
    }

    setPoseLineThickness(value: number): void {
        this._options.poseLineThickness = value
        this.saveOptions()
    }

    setOnlyMotionDetection(value: boolean): void {
        this._options.onlyMotionDetection = value
        this.saveOptions()
    }

    applyOptions(motionDetection: MotionDetectionService, videoElement?: HTMLVideoElement): void {
        this._motionDetection = motionDetection
        this._videoElement = videoElement
        
        if (videoElement) {
            videoElement.style.display = this.options.showVideo ? "block" : "none"
        }
        
        motionDetection["gridSize"] = this.options.gridSize
        motionDetection["bufferSize"] = this.options.bufferSize
        motionDetection["significantChangeTreshold"] = this.options.significantChangeThreshold
    }

    initializeEventListeners(motionDetection: MotionDetectionService, videoElement?: HTMLVideoElement): void {
        this._motionDetection = motionDetection
        this._videoElement = videoElement

        // Voeg pose-active class standaard toe aan de sidebar
        const sidebar = document.querySelector(".sidebar") as HTMLElement
        if (sidebar) {
            sidebar.classList.add("pose-active")
        }

        const gridXInput = document.querySelector("#gridX") as HTMLInputElement
        const gridYInput = document.querySelector("#gridY") as HTMLInputElement
        const bufferInput = document.querySelector("#buffer") as HTMLInputElement
        const showVideoInput = document.querySelector("#showVideo") as HTMLInputElement
        const thresholdInput = document.querySelector("#threshold") as HTMLInputElement
        const videoEffectSelect = document.querySelector("#videoEffectSelect") as HTMLSelectElement
        const toggleButton = document.querySelector(".toggle-button") as HTMLButtonElement

        // Vul de video effect select met opties
        videoEffectSelect.innerHTML = this._videoEffects.map(effect => `
            <option value="${effect.name}">
                ${effect.name}
            </option>
        `).join("")

        // Update de geselecteerde video effect in de dropdown
        videoEffectSelect.value = this.options.selectedVideoEffect

        // Update de initiële waarden
        const options = this.options
        gridXInput.value = options.gridSize.x.toString()
        gridYInput.value = options.gridSize.y.toString()
        bufferInput.value = options.bufferSize.toString()
        thresholdInput.value = options.significantChangeThreshold.toString()
        const gridXValueInput = document.querySelector("#gridXValue") as HTMLInputElement
        const gridYValueInput = document.querySelector("#gridYValue") as HTMLInputElement
        const bufferValueInput = document.querySelector("#bufferValue") as HTMLInputElement
        const thresholdValueInput = document.querySelector("#thresholdValue") as HTMLInputElement
        gridXValueInput.value = options.gridSize.x.toString()
        gridYValueInput.value = options.gridSize.y.toString()
        bufferValueInput.value = options.bufferSize.toString()
        thresholdValueInput.value = options.significantChangeThreshold.toString()
        showVideoInput.checked = options.showVideo

        // Event listeners voor grid X
        gridXInput.addEventListener("input", () => {
            const value = parseInt(gridXInput.value)
            gridXValueInput.value = value.toString()
            this.setGridSize(value, options.gridSize.y)
        })

        gridXValueInput.addEventListener("input", () => {
            const value = parseInt(gridXValueInput.value)
            gridXInput.value = value.toString()
            this.setGridSize(value, options.gridSize.y)
        })

        // Event listeners voor grid Y
        gridYInput.addEventListener("input", () => {
            const value = parseInt(gridYInput.value)
            gridYValueInput.value = value.toString()
            this.setGridSize(options.gridSize.x, value)
        })

        gridYValueInput.addEventListener("input", () => {
            const value = parseInt(gridYValueInput.value)
            gridYInput.value = value.toString()
            this.setGridSize(options.gridSize.x, value)
        })

        // Event listeners voor buffer
        bufferInput.addEventListener("input", () => {
            const value = parseInt(bufferInput.value)
            bufferValueInput.value = value.toString()
            this.setBufferSize(value)
        })

        bufferValueInput.addEventListener("input", () => {
            const value = parseInt(bufferValueInput.value)
            bufferInput.value = value.toString()
            this.setBufferSize(value)
        })

        showVideoInput.addEventListener("change", () => {
            const isChecked = showVideoInput.checked
            this.setShowVideo(isChecked)
        })

        // Event listeners voor threshold
        thresholdInput.addEventListener("input", () => {
            const value = parseInt(thresholdInput.value)
            thresholdValueInput.value = value.toString()
            this.setSignificantChangeThreshold(value)
        })

        thresholdValueInput.addEventListener("input", () => {
            const value = parseInt(thresholdValueInput.value)
            thresholdInput.value = value.toString()
            this.setSignificantChangeThreshold(value)
        })

        videoEffectSelect.addEventListener("change", () => {
            const newEffect = videoEffectSelect.value
            this.setSelectedVideoEffect(newEffect)
            if (this._motionDetection) {
                this.applyOptions(this._motionDetection, this._videoElement)
            }
        })

        // Toggle sidebar
        toggleButton.addEventListener("click", () => {
            sidebar.classList.toggle("open")
        })

        // Voeg event listener toe voor showPose checkbox
        const showPoseCheckbox = document.getElementById("showPose") as HTMLInputElement
        if (showPoseCheckbox) {
            showPoseCheckbox.checked = this._options.showPose
            showPoseCheckbox.disabled = true // Begin met disabled
            showPoseCheckbox.addEventListener("change", (e) => {
                this.setShowPose((e.target as HTMLInputElement).checked)
            })
        }

        // Voeg event listener toe voor showPoseBW checkbox
        const showPoseBWCheckbox = document.getElementById("showPoseBW") as HTMLInputElement
        if (showPoseBWCheckbox) {
            showPoseBWCheckbox.checked = this._options.showPoseBW
            showPoseBWCheckbox.disabled = true // Begin met disabled
            showPoseBWCheckbox.addEventListener("change", (e) => {
                this.setShowPoseBW((e.target as HTMLInputElement).checked)
            })
        }

        // Voeg event listener toe voor usePoseStream checkbox
        const usePoseStreamCheckbox = document.getElementById("usePoseStream") as HTMLInputElement
        if (usePoseStreamCheckbox) {
            usePoseStreamCheckbox.checked = this._options.usePoseStream

            const poseUpdateHandler = () => {
                showPoseCheckbox.disabled = false
                showPoseBWCheckbox.disabled = false
                document.removeEventListener("poseDetectionInitialized", poseUpdateHandler)
            }

            document.addEventListener("poseDetectionInitialized", poseUpdateHandler)

            usePoseStreamCheckbox.addEventListener("change", () => {
                this.setUsePoseStream(usePoseStreamCheckbox.checked)
            })
        }

        // Voeg event listener toe voor poseLineThickness slider
        const poseLineThicknessSlider = document.getElementById("poseLineThickness") as HTMLInputElement
        const poseLineThicknessValue = document.getElementById("poseLineThicknessValue") as HTMLInputElement
        if (poseLineThicknessSlider && poseLineThicknessValue) {
            poseLineThicknessSlider.value = this._options.poseLineThickness.toString()
            poseLineThicknessValue.value = this._options.poseLineThickness.toString()
            
            poseLineThicknessSlider.addEventListener("input", (e) => {
                const value = parseInt((e.target as HTMLInputElement).value)
                poseLineThicknessValue.value = value.toString()
                this.setPoseLineThickness(value)
            })
            
            poseLineThicknessValue.addEventListener("change", (e) => {
                const value = parseInt((e.target as HTMLInputElement).value)
                poseLineThicknessSlider.value = value.toString()
                this.setPoseLineThickness(value)
            })
        }

        // Voeg event listener toe voor onlyMotionDetection checkbox
        const onlyMotionDetectionCheckbox = document.getElementById("onlyMotionDetection") as HTMLInputElement
        if (onlyMotionDetectionCheckbox) {
            onlyMotionDetectionCheckbox.checked = this._options.onlyMotionDetection
            // Schakel de checkbox uit als buffer size 1 of lager is
            onlyMotionDetectionCheckbox.disabled = this._options.bufferSize <= 1
            onlyMotionDetectionCheckbox.addEventListener("change", () => {
                this.setOnlyMotionDetection(onlyMotionDetectionCheckbox.checked)
            })
        }

        // Pas de initiële opties toe
        this.applyOptions(motionDetection, videoElement)
    }

    getVideoEffectByName(name: string): VideoEffect | undefined {
        return this._videoEffects.find(effect => effect.name === name)
    }
} 