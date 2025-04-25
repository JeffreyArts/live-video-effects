export interface ImageValue {
    min: number;
    max: number;
    val: string;
    if?: string;
}

export interface ImageStyle {
    name: string;
    type: "image";
    valueRange: number;
    values: ImageValue[];
}

export class ImageLogicService {
    private static instance: ImageLogicService
    private currentValue: number = 0
    private neighbors: {
        t?: number;  // top
        b?: number;  // bottom
        l?: number;  // left
        r?: number;  // right
        tl?: number; // top left
        tr?: number; // top right
        bl?: number; // bottom left
        br?: number; // bottom right
    } = {}

    private constructor() {}

    public static getInstance(): ImageLogicService {
        if (!ImageLogicService.instance) {
            ImageLogicService.instance = new ImageLogicService()
        }
        return ImageLogicService.instance
    }

    public setCurrentValue(value: number): void {
        this.currentValue = value
    }

    public setNeighbors(neighbors: typeof this.neighbors): void {
        this.neighbors = neighbors
    }

    public evaluateCondition(condition?: string): boolean {
        if (!condition) return true

        /* eslint-disable @typescript-eslint/no-unused-vars, no-eval */
        // @ts-expect-error - Variables are used in eval for dynamic condition evaluation
        const { c, t, b, l, r, tl, tr, bl, br } = {
            c: this.currentValue,
            t: this.neighbors.t,
            b: this.neighbors.b,
            l: this.neighbors.l,
            r: this.neighbors.r,
            tl: this.neighbors.tl,
            tr: this.neighbors.tr,
            bl: this.neighbors.bl,
            br: this.neighbors.br
        }
        /* eslint-enable @typescript-eslint/no-unused-vars, no-eval */

        try {
            return eval(condition)
        } catch (error) {
            console.error("Fout bij evalueren van conditie:", error)
            return false
        }
    }

    public getImageForValue(style: ImageStyle): string {
        const value = this.currentValue

        const matchingValues = style.values.filter(v => { 
            if (v.if) {
                return this.evaluateCondition(v.if)
            }
            return (value >= v.min && value <= v.max)
        })
        
        // console.log(`c: ${this.currentValue} l: ${this.neighbors.l} r: ${this.neighbors.r} |`, style.values[3].if,  matchingValues)

        if (matchingValues.length === 0) {
            return style.values[0].val // Fallback naar eerste waarde
        }

        // Als er meerdere matches zijn, kies degene met de kleinste range
        return matchingValues[matchingValues.length-1].val
    }
} 