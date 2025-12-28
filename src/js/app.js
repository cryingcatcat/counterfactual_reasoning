import { parseGraphToMermaid, fetchExamples } from './utils.js';

let allExamples = {};

async function updateReport(key) {
    const data = allExamples[key];
    if (!data) return;

    try {
        // Update text content
        document.getElementById('factual-story').innerText = data.T;
        document.getElementById('intervention-variable').innerText = data.V;
        document.getElementById('cf-question').innerText = data.Q;
        document.getElementById('math-query').innerText = data.M;
        document.getElementById('response-s').innerText = data.S;
        document.getElementById('response-s-prime').innerText = data["S'"] || "";
        document.getElementById('error-description').innerText = data.Error;
        document.getElementById('raw-graph-text').innerText = data.G;

        // Render Diagram
        const mermaidDefinition = parseGraphToMermaid(data.G);
        const container = document.getElementById('mermaid-container');
        
        container.innerHTML = `<pre class="mermaid" id="mermaid-viz">${mermaidDefinition}</pre>`;
        
        mermaid.initialize({ 
            startOnLoad: false,
            theme: 'base',
            themeVariables: {
                primaryColor: '#ffffff',
                primaryTextColor: '#1a1a1a',
                primaryBorderColor: '#d1cfc7',
                lineColor: '#1a1a1a',
                secondaryColor: '#f3f0e8',
                tertiaryColor: '#ffffff',
                fontSize: '11px',
                fontFamily: 'Inter, sans-serif'
            }
        });
        
        await mermaid.run({
            nodes: [document.getElementById('mermaid-viz')]
        });
    } catch (err) {
        console.error("Error updating report:", err);
    }
}

async function init() {
    try {
        allExamples = await fetchExamples();
        
        const selector = document.getElementById('example-selector');
        selector.addEventListener('change', (e) => updateReport(e.target.value));

        // Initial load
        if (selector.value) {
            updateReport(selector.value);
        }
    } catch (err) {
        console.error("Initialization failed:", err);
    }
}

document.addEventListener('DOMContentLoaded', init);
