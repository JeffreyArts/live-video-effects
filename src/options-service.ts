export type StyleType = 'rectangle' | 'dot' | 'image' | 'text';

export interface StyleValue {
    min?: number;
    max?: number;
    val: string | number;
    if?: string;
}

export interface Style {
    name: string;
    defaultValue?: string
    valueRange?: number
    type: StyleType;
    values: StyleValue[];
}

export interface Options {
    showVideo: boolean;
    gridSize: {
        x: number;
        y: number;
    };
    bufferSize: number;
    significantChangeThreshold: number;
    selectedStyle: string;
}

const STORAGE_KEY = 'webcam-options';

const defaultOptions: Options = {
    showVideo: true,
    gridSize: { x: 9, y: 9 },
    bufferSize: 10,
    significantChangeThreshold: 50,
    selectedStyle: 'Zwarte blokken'
};

const styles: Style[] = [
    {
        name: 'Wit minimal',
        type: 'dot',
        defaultValue: 'black',
        values: [
            {min: 0, max: 0.25, val: 0},
            {min: 0.25, max: 0.5, val: .33},
            {min: 0.5, max: 0.75, val: .666},
            {min: 0.75, max: 1, val: 1}
        ]
    },
    {
        name: 'Emoji',
        type: 'text',
        valueRange: 6,
        values: [
            {min: 0, max: 0, val: "😄"},
            {min: 0.2, max: 0.2, val: "😌"},
            {min: 0.4, max: 0.4, val: "🙂"},
            {min: 0.6, max: 0.6, val: "😕"},
            {min: 0.8, max: .8, val: "🙁"},
            {min: 1, max: 1, val: "😫"},
        ]
    },
    {
        name: 'Line3',
        type: 'image',
        valueRange: 3,
        values: [
            {min: 0, max: 0, val: "0.png"},
            {min: .5, max: .5, val: "1.png"},
            {min: 1, max: 1, val: "2.png"},
            {if: "l==0.5 && r==0.5 && c==0",  val: "1.png"},
            {if: "l==0 && r==0.5 && c==0", val: "0)1.png"},
            {if: "l==0.5 && r==0 && c==0", val: "1)0.png"},
            {if: "l==0.5 && r==0.5 && c==1", val: "2.png"},
            {if: "l==0 && r==1", val: "0)2.png"},
            {if: "l==1 && r==0 && c==0", val: "2)0.png"},
            {if: "l==0.5 && r==1 && c==0.5", val: "1)2.png"},
            {if: "l==1 && r==0.5 && c==0.5", val: "2)1.png"},
        ]
    },
    {
        name: 'Zwarte blokken',
        type: 'rectangle',
        values: [
            {min: 0, max: 0.015625, val: '#000000'},
            {min: 0.015625, max: 0.03125, val: '#040404'},
            {min: 0.03125, max: 0.046875, val: '#080808'},
            {min: 0.046875, max: 0.0625, val: '#0c0c0c'},
            {min: 0.0625, max: 0.078125, val: '#101010'},
            {min: 0.078125, max: 0.09375, val: '#141414'},
            {min: 0.09375, max: 0.109375, val: '#181818'},
            {min: 0.109375, max: 0.125, val: '#1c1c1c'},
            {min: 0.125, max: 0.140625, val: '#202020'},
            {min: 0.140625, max: 0.15625, val: '#242424'},
            {min: 0.15625, max: 0.171875, val: '#282828'},
            {min: 0.171875, max: 0.1875, val: '#2c2c2c'},
            {min: 0.1875, max: 0.203125, val: '#303030'},
            {min: 0.203125, max: 0.21875, val: '#343434'},
            {min: 0.21875, max: 0.234375, val: '#383838'},
            {min: 0.234375, max: 0.25, val: '#3c3c3c'},
            {min: 0.25, max: 0.265625, val: '#404040'},
            {min: 0.265625, max: 0.28125, val: '#444444'},
            {min: 0.28125, max: 0.296875, val: '#484848'},
            {min: 0.296875, max: 0.3125, val: '#4c4c4c'},
            {min: 0.3125, max: 0.328125, val: '#505050'},
            {min: 0.328125, max: 0.34375, val: '#545454'},
            {min: 0.34375, max: 0.359375, val: '#585858'},
            {min: 0.359375, max: 0.375, val: '#5c5c5c'},
            {min: 0.375, max: 0.390625, val: '#606060'},
            {min: 0.390625, max: 0.40625, val: '#646464'},
            {min: 0.40625, max: 0.421875, val: '#686868'},
            {min: 0.421875, max: 0.4375, val: '#6c6c6c'},
            {min: 0.4375, max: 0.453125, val: '#707070'},
            {min: 0.453125, max: 0.46875, val: '#747474'},
            {min: 0.46875, max: 0.484375, val: '#787878'},
            {min: 0.484375, max: 0.5, val: '#7c7c7c'},
            {min: 0.5, max: 0.515625, val: '#808080'},
            {min: 0.515625, max: 0.53125, val: '#848484'},
            {min: 0.53125, max: 0.546875, val: '#888888'},
            {min: 0.546875, max: 0.5625, val: '#8c8c8c'},
            {min: 0.5625, max: 0.578125, val: '#909090'},
            {min: 0.578125, max: 0.59375, val: '#949494'},
            {min: 0.59375, max: 0.609375, val: '#989898'},
            {min: 0.609375, max: 0.625, val: '#9c9c9c'},
            {min: 0.625, max: 0.640625, val: '#a0a0a0'},
            {min: 0.640625, max: 0.65625, val: '#a4a4a4'},
            {min: 0.65625, max: 0.671875, val: '#a8a8a8'},
            {min: 0.671875, max: 0.6875, val: '#acacac'},
            {min: 0.6875, max: 0.703125, val: '#b0b0b0'},
            {min: 0.703125, max: 0.71875, val: '#b4b4b4'},
            {min: 0.71875, max: 0.734375, val: '#b8b8b8'},
            {min: 0.734375, max: 0.75, val: '#bcbcbc'},
            {min: 0.75, max: 0.765625, val: '#c0c0c0'},
            {min: 0.765625, max: 0.78125, val: '#c4c4c4'},
            {min: 0.78125, max: 0.796875, val: '#c8c8c8'},
            {min: 0.796875, max: 0.8125, val: '#cccccc'},
            {min: 0.8125, max: 0.828125, val: '#d0d0d0'},
            {min: 0.828125, max: 0.84375, val: '#d4d4d4'},
            {min: 0.84375, max: 0.859375, val: '#d8d8d8'},
            {min: 0.859375, max: 0.875, val: '#dcdcdc'},
            {min: 0.875, max: 0.890625, val: '#e0e0e0'},
            {min: 0.890625, max: 0.90625, val: '#e4e4e4'},
            {min: 0.90625, max: 0.921875, val: '#e8e8e8'},
            {min: 0.921875, max: 0.9375, val: '#ececec'},
            {min: 0.9375, max: 0.953125, val: '#f0f0f0'},
            {min: 0.953125, max: 0.96875, val: '#f4f4f4'},
            {min: 0.96875, max: 0.984375, val: '#f8f8f8'},
            {min: 0.984375, max: 1, val: '#ffffff'}
        ]
    },
    {
        name: 'Witte blokken',
        type: 'rectangle',
        values: [
            {min: 0, max: 0.015625, val: '#ffffff'},
            {min: 0.015625, max: 0.03125, val: '#fbfbfb'},
            {min: 0.03125, max: 0.046875, val: '#f7f7f7'},
            {min: 0.046875, max: 0.0625, val: '#f3f3f3'},
            {min: 0.0625, max: 0.078125, val: '#efefef'},
            {min: 0.078125, max: 0.09375, val: '#ebebeb'},
            {min: 0.09375, max: 0.109375, val: '#e7e7e7'},
            {min: 0.109375, max: 0.125, val: '#e3e3e3'},
            {min: 0.125, max: 0.140625, val: '#dfdfdf'},
            {min: 0.140625, max: 0.15625, val: '#dbdbdb'},
            {min: 0.15625, max: 0.171875, val: '#d7d7d7'},
            {min: 0.171875, max: 0.1875, val: '#d3d3d3'},
            {min: 0.1875, max: 0.203125, val: '#cfcfcf'},
            {min: 0.203125, max: 0.21875, val: '#cbcbcb'},
            {min: 0.21875, max: 0.234375, val: '#c7c7c7'},
            {min: 0.234375, max: 0.25, val: '#c3c3c3'},
            {min: 0.25, max: 0.265625, val: '#bfbfbf'},
            {min: 0.265625, max: 0.28125, val: '#bbbbbb'},
            {min: 0.28125, max: 0.296875, val: '#b7b7b7'},
            {min: 0.296875, max: 0.3125, val: '#b3b3b3'},
            {min: 0.3125, max: 0.328125, val: '#afafaf'},
            {min: 0.328125, max: 0.34375, val: '#ababab'},
            {min: 0.34375, max: 0.359375, val: '#a7a7a7'},
            {min: 0.359375, max: 0.375, val: '#a3a3a3'},
            {min: 0.375, max: 0.390625, val: '#9f9f9f'},
            {min: 0.390625, max: 0.40625, val: '#9b9b9b'},
            {min: 0.40625, max: 0.421875, val: '#979797'},
            {min: 0.421875, max: 0.4375, val: '#939393'},
            {min: 0.4375, max: 0.453125, val: '#8f8f8f'},
            {min: 0.453125, max: 0.46875, val: '#8b8b8b'},
            {min: 0.46875, max: 0.484375, val: '#878787'},
            {min: 0.484375, max: 0.5, val: '#838383'},
            {min: 0.5, max: 0.515625, val: '#7f7f7f'},
            {min: 0.515625, max: 0.53125, val: '#7b7b7b'},
            {min: 0.53125, max: 0.546875, val: '#777777'},
            {min: 0.546875, max: 0.5625, val: '#737373'},
            {min: 0.5625, max: 0.578125, val: '#6f6f6f'},
            {min: 0.578125, max: 0.59375, val: '#6b6b6b'},
            {min: 0.59375, max: 0.609375, val: '#676767'},
            {min: 0.609375, max: 0.625, val: '#636363'},
            {min: 0.625, max: 0.640625, val: '#5f5f5f'},
            {min: 0.640625, max: 0.65625, val: '#5b5b5b'},
            {min: 0.65625, max: 0.671875, val: '#575757'},
            {min: 0.671875, max: 0.6875, val: '#535353'},
            {min: 0.6875, max: 0.703125, val: '#4f4f4f'},
            {min: 0.703125, max: 0.71875, val: '#4b4b4b'},
            {min: 0.71875, max: 0.734375, val: '#474747'},
            {min: 0.734375, max: 0.75, val: '#434343'},
            {min: 0.75, max: 0.765625, val: '#3f3f3f'},
            {min: 0.765625, max: 0.78125, val: '#3b3b3b'},
            {min: 0.78125, max: 0.796875, val: '#373737'},
            {min: 0.796875, max: 0.8125, val: '#333333'},
            {min: 0.8125, max: 0.828125, val: '#2f2f2f'},
            {min: 0.828125, max: 0.84375, val: '#2b2b2b'},
            {min: 0.84375, max: 0.859375, val: '#272727'},
            {min: 0.859375, max: 0.875, val: '#232323'},
            {min: 0.875, max: 0.890625, val: '#1f1f1f'},
            {min: 0.890625, max: 0.90625, val: '#1b1b1b'},
            {min: 0.90625, max: 0.921875, val: '#171717'},
            {min: 0.921875, max: 0.9375, val: '#131313'},
            {min: 0.9375, max: 0.953125, val: '#0f0f0f'},
            {min: 0.953125, max: 0.96875, val: '#0b0b0b'},
            {min: 0.96875, max: 0.984375, val: '#070707'},
            {min: 0.984375, max: 1, val: '#000000'}
        ]
    },
    {
        name: 'Regenboog blokken',
        type: 'dot',
        defaultValue: "hsl(0, 100%, 50%)",
        values: [
            {min: 0, max: 0.015625, val: 1},
            {min: 0.015625, max: 0.03125, val: .75},
            {min: 0.03125, max: 0.046875, val: 'hsl(11.25, 100%, 50%)'},
            {min: 0.046875, max: 0.0625, val: 'hsl(16.875, 100%, 50%)'},
            {min: 0.0625, max: 0.078125, val: 'hsl(22.5, 100%, 50%)'},
            {min: 0.078125, max: 0.09375, val: 'hsl(28.125, 100%, 50%)'},
            {min: 0.09375, max: 0.109375, val: 'hsl(33.75, 100%, 50%)'},
            {min: 0.109375, max: 0.125, val: 'hsl(39.375, 100%, 50%)'},
            {min: 0.125, max: 0.140625, val: 'hsl(45, 100%, 50%)'},
            {min: 0.140625, max: 0.15625, val: 'hsl(50.625, 100%, 50%)'},
            {min: 0.15625, max: 0.171875, val: 'hsl(56.25, 100%, 50%)'},
            {min: 0.171875, max: 0.1875, val: 'hsl(61.875, 100%, 50%)'},
            {min: 0.1875, max: 0.203125, val: 'hsl(67.5, 100%, 50%)'},
            {min: 0.203125, max: 0.21875, val: 'hsl(73.125, 100%, 50%)'},
            {min: 0.21875, max: 0.234375, val: 'hsl(78.75, 100%, 50%)'},
            {min: 0.234375, max: 0.25, val: 'hsl(84.375, 100%, 50%)'},
            {min: 0.25, max: 0.265625, val: 'hsl(90, 100%, 50%)'},
            {min: 0.265625, max: 0.28125, val: 'hsl(95.625, 100%, 50%)'},
            {min: 0.28125, max: 0.296875, val: 'hsl(101.25, 100%, 50%)'},
            {min: 0.296875, max: 0.3125, val: 'hsl(106.875, 100%, 50%)'},
            {min: 0.3125, max: 0.328125, val: 'hsl(112.5, 100%, 50%)'},
            {min: 0.328125, max: 0.34375, val: 'hsl(118.125, 100%, 50%)'},
            {min: 0.34375, max: 0.359375, val: 'hsl(123.75, 100%, 50%)'},
            {min: 0.359375, max: 0.375, val: 'hsl(129.375, 100%, 50%)'},
            {min: 0.375, max: 0.390625, val: 'hsl(135, 100%, 50%)'},
            {min: 0.390625, max: 0.40625, val: 'hsl(140.625, 100%, 50%)'},
            {min: 0.40625, max: 0.421875, val: 'hsl(146.25, 100%, 50%)'},
            {min: 0.421875, max: 0.4375, val: 'hsl(151.875, 100%, 50%)'},
            {min: 0.4375, max: 0.453125, val: 'hsl(157.5, 100%, 50%)'},
            {min: 0.453125, max: 0.46875, val: 'hsl(163.125, 100%, 50%)'},
            {min: 0.46875, max: 0.484375, val: 'hsl(168.75, 100%, 50%)'},
            {min: 0.484375, max: 0.5, val: 'hsl(174.375, 100%, 50%)'},
            {min: 0.5, max: 0.515625, val: 'hsl(180, 100%, 50%)'},
            {min: 0.515625, max: 0.53125, val: 'hsl(185.625, 100%, 50%)'},
            {min: 0.53125, max: 0.546875, val: 'hsl(191.25, 100%, 50%)'},
            {min: 0.546875, max: 0.5625, val: 'hsl(196.875, 100%, 50%)'},
            {min: 0.5625, max: 0.578125, val: 'hsl(202.5, 100%, 50%)'},
            {min: 0.578125, max: 0.59375, val: 'hsl(208.125, 100%, 50%)'},
            {min: 0.59375, max: 0.609375, val: 'hsl(213.75, 100%, 50%)'},
            {min: 0.609375, max: 0.625, val: 'hsl(219.375, 100%, 50%)'},
            {min: 0.625, max: 0.640625, val: 'hsl(225, 100%, 50%)'},
            {min: 0.640625, max: 0.65625, val: 'hsl(230.625, 100%, 50%)'},
            {min: 0.65625, max: 0.671875, val: 'hsl(236.25, 100%, 50%)'},
            {min: 0.671875, max: 0.6875, val: 'hsl(241.875, 100%, 50%)'},
            {min: 0.6875, max: 0.703125, val: 'hsl(247.5, 100%, 50%)'},
            {min: 0.703125, max: 0.71875, val: 'hsl(253.125, 100%, 50%)'},
            {min: 0.71875, max: 0.734375, val: 'hsl(258.75, 100%, 50%)'},
            {min: 0.734375, max: 0.75, val: 'hsl(264.375, 100%, 50%)'},
            {min: 0.75, max: 0.765625, val: 'hsl(270, 100%, 50%)'},
            {min: 0.765625, max: 0.78125, val: 'hsl(275.625, 100%, 50%)'},
            {min: 0.78125, max: 0.796875, val: 'hsl(281.25, 100%, 50%)'},
            {min: 0.796875, max: 0.8125, val: 'hsl(286.875, 100%, 50%)'},
            {min: 0.8125, max: 0.828125, val: 'hsl(292.5, 100%, 50%)'},
            {min: 0.828125, max: 0.84375, val: 'hsl(298.125, 100%, 50%)'},
            {min: 0.84375, max: 0.859375, val: 'hsl(303.75, 100%, 50%)'},
            {min: 0.859375, max: 0.875, val: 'hsl(309.375, 100%, 50%)'},
            {min: 0.875, max: 0.890625, val: 'hsl(315, 100%, 50%)'},
            {min: 0.890625, max: 0.90625, val: 'hsl(320.625, 100%, 50%)'},
            {min: 0.90625, max: 0.921875, val: 'hsl(326.25, 100%, 50%)'},
            {min: 0.921875, max: 0.9375, val: 'hsl(331.875, 100%, 50%)'},
            {min: 0.9375, max: 0.953125, val: 'hsl(337.5, 100%, 50%)'},
            {min: 0.953125, max: 0.96875, val: 'hsl(343.125, 100%, 50%)'},
            {min: 0.96875, max: 0.984375, val: 'hsl(348.75, 100%, 50%)'},
            {min: 0.984375, max: 1, val: 'hsl(354.375, 100%, 50%)'}
        ]
    }
];

let currentOptions: Options = loadOptions();

function loadOptions(): Options {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...defaultOptions, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.error('Kon opgeslagen opties niet laden:', error);
    }
    return defaultOptions;
}

function saveOptions(): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentOptions));
    } catch (error) {
        console.error('Kon opties niet opslaan:', error);
    }
}

export const optionsService = {
    get options(): Options {
        return { ...currentOptions };
    },

    get styles(): Style[] {
        return styles;
    },

    setShowVideo(value: boolean): void {
        currentOptions.showVideo = value;
        saveOptions();
    },

    setGridSize(x: number, y: number): void {
        currentOptions.gridSize = { x, y };
        saveOptions();
    },

    setBufferSize(value: number): void {
        currentOptions.bufferSize = value;
        saveOptions();
    },

    setSignificantChangeThreshold(value: number): void {
        currentOptions.significantChangeThreshold = value;
        saveOptions();
    },

    setSelectedStyle(value: string): void {
        currentOptions.selectedStyle = value;
        saveOptions();
    },

    applyOptions(motionDetection: any, videoElement?: HTMLVideoElement): void {
        // Update grid size
        if (motionDetection) {
            motionDetection['gridSize'] = { ...currentOptions.gridSize };
        }

        // Update buffer size
        if (motionDetection) {
            motionDetection['bufferSize'] = currentOptions.bufferSize;
        }

        // Update significant change threshold
        if (motionDetection) {
            motionDetection['significantChangeTreshold'] = currentOptions.significantChangeThreshold;
        }

        // Update video visibility
        if (videoElement) {
            videoElement.style.display = currentOptions.showVideo ? 'block' : 'none';
        }

        // Update UI elements
        const gridXValue = document.querySelector('#gridXValue');
        const gridYValue = document.querySelector('#gridYValue');
        const bufferValue = document.querySelector('#bufferValue');
        const thresholdValue = document.querySelector('#thresholdValue');
        const showVideoInput = document.querySelector('#showVideo') as HTMLInputElement;
        const styleSelect = document.querySelector('#style') as HTMLSelectElement;

        if (gridXValue) gridXValue.textContent = currentOptions.gridSize.x.toString();
        if (gridYValue) gridYValue.textContent = currentOptions.gridSize.y.toString();
        if (bufferValue) bufferValue.textContent = currentOptions.bufferSize.toString();
        if (thresholdValue) thresholdValue.textContent = currentOptions.significantChangeThreshold.toString();
        if (showVideoInput) showVideoInput.checked = currentOptions.showVideo;
        if (styleSelect) styleSelect.value = currentOptions.selectedStyle;
    }
}; 