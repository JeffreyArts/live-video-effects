import { VideoEffect } from "./options-service"

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

    private getValueForVariable(varName: string): number | undefined {
        switch(varName) {
            case "c": return this.currentValue
            case "t": return this.neighbors.t
            case "b": return this.neighbors.b
            case "l": return this.neighbors.l
            case "r": return this.neighbors.r
            case "tl": return this.neighbors.tl
            case "tr": return this.neighbors.tr
            case "bl": return this.neighbors.bl
            case "br": return this.neighbors.br
            default: return undefined
        }
    }

    private parseValue(value: string): number | undefined {
        if (["c", "t", "b", "l", "r", "tl", "tr", "bl", "br"].includes(value)) {
            return this.getValueForVariable(value)
        }
        const num = parseFloat(value)
        return isNaN(num) ? undefined : num
    }

    private evaluateExpression(expression: string): boolean {
        expression = expression.replace(/\s+/g, "")

        if (expression.includes("&&")) {
            return expression.split("&&").every(part => this.evaluateExpression(part))
        }
        if (expression.includes("||")) {
            return expression.split("||").some(part => this.evaluateExpression(part))
        }

        const operators = ["==", "!=", ">=", "<=", ">", "<"]
        for (const op of operators) {
            if (expression.includes(op)) {
                const [left, right] = expression.split(op)
                const leftValue = this.parseValue(left)
                const rightValue = this.parseValue(right)
                
                if (leftValue === undefined || rightValue === undefined) {
                    continue
                }

                switch(op) {
                    case "==": return leftValue === rightValue
                    case "!=": return leftValue !== rightValue
                    case ">=": return leftValue >= rightValue
                    case "<=": return leftValue <= rightValue
                    case ">": return leftValue > rightValue
                    case "<": return leftValue < rightValue
                }
            }
        }

        return false
    }

    public evaluateCondition(condition?: string): boolean {
        if (!condition) return true
        
        try {
            return this.evaluateExpression(condition)
        } catch (error) {
            return false
        }
    }

    public getImageForValue(videoEffect: VideoEffect): string {
        if (videoEffect.type !== "image") {
            return videoEffect.values[0].val.toString()
        }

        const matchingValues = videoEffect.values.filter(v => {
            if (v.if) {
                return this.evaluateCondition(v.if)
            }
            return v.min === v.max && v.min === this.currentValue
        })

        if (matchingValues.length > 0) {
            return matchingValues[matchingValues.length - 1].val.toString()
        }

        return videoEffect.values[0].val.toString()
    }
} 