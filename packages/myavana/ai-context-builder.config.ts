// ai-context-builder.config.ts
const config = {
    patterns: [
        'src/**/*.ts', // Include all TypeScript files in src
        'package.json', // Include the package.json file
        'README.md', // Include this README
        '!src/**/*.spec.ts', // Exclude test files
        'docs/**/*.md', // Include all Markdown files in docs
    ],
    output: 'myavana-chatbot-context.md',
}
export default config