import typescriptEslint from "@typescript-eslint/eslint-plugin"
import stylistic from "@stylistic/eslint-plugin-ts"
import globals from "globals"
import path from "node:path"
import { fileURLToPath } from "node:url"
import js from "@eslint/js"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
})

export default [
    {
        ignores: ["dist/**/*"]
    },
    ...compat.extends("plugin:@typescript-eslint/recommended"),
    {
        files: ["**/*.ts"],
        plugins: {
            "@typescript-eslint": typescriptEslint,
            "@stylistic/ts": stylistic,
        },

        languageOptions: {
            globals: {
                ...globals.browser,
            },
            ecmaVersion: "latest",
            sourceType: "module",

            parserOptions: {
                parser: "@typescript-eslint/parser",
            },
        },

        rules: {
            "@stylistic/ts/indent": ["error", 4],
            "@stylistic/ts/quotes": ["error", "double"],
            "@stylistic/ts/semi": ["error", "never"],

            "@stylistic/ts/object-curly-spacing": ["error", "always", {
                objectsInObjects: false,
            }],

            "linebreak-style": ["error", "unix"],
        },
    },
]