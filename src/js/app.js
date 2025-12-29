import { parseGraphToMermaid, fetchExamples } from './utils.js';
import { highlightDifferences } from './diff.js';

let allExamples = {};

async function updateReport(key) {
    const data = allExamples[key];
    if (!data) return;

    try {
        // Reset animations by removing/adding classes or re-triggering reflow
        const dashboard = document.querySelector('.dashboard');
        
        // Update text content
        document.getElementById('factual-story').innerText = data.T;
        document.getElementById('intervention-variable').innerText = data.V;
        
        const cfQuestion = document.getElementById('cf-question');
        cfQuestion.innerText = data.Q;
        
        // Dynamically adjust font size for the query based on length
        if (data.Q.length > 200) {
            cfQuestion.style.fontSize = '1.1rem';
        } else if (data.Q.length > 120) {
            cfQuestion.style.fontSize = '1.25rem';
        } else if (data.Q.length > 80) {
            cfQuestion.style.fontSize = '1.4rem';
        } else {
            cfQuestion.style.fontSize = '1.6rem';
        }

        document.getElementById('math-query').innerText = data.M;
        
        // Highlight differences between S and S'
        const diffs = highlightDifferences(data.S, data["S'"] || "");
        document.getElementById('response-s').innerHTML = diffs.html1;
        document.getElementById('response-s-prime').innerHTML = diffs.html2;

        document.getElementById('error-description').innerText = data.Error;
        document.getElementById('raw-graph-text').innerText = data.G;

        // Force a reflow to restart text entry animations
        const animatedTexts = document.querySelectorAll('.factual-text, .cf-query-text');
        animatedTexts.forEach(el => {
            el.style.animation = 'none';
            el.offsetHeight; /* trigger reflow */
            el.style.animation = null;
        });

        // Render Diagram
        const mermaidDefinition = parseGraphToMermaid(data.G);
        const container = document.getElementById('mermaid-container');
        
        container.innerHTML = `<pre class="mermaid" id="mermaid-viz">${mermaidDefinition}</pre>`;
        
        mermaid.initialize({ 
            startOnLoad: false,
            useMaxWidth: false,
            theme: 'base',
            themeVariables: {
                primaryColor: '#ffffff',
                primaryTextColor: '#2d2d2d',
                primaryBorderColor: '#bfa15c',
                lineColor: '#bfa15c',
                secondaryColor: '#fdfdfc',
                tertiaryColor: '#ffffff',
                fontSize: '14px',
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

        // Modal Logic
        const modal = document.getElementById('spec-modal');
        const viewBtn = document.getElementById('view-spec-btn');

        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent immediate closing
            modal.classList.add('active');
        });

        // Close when clicking anywhere
        document.addEventListener('click', () => {
            if (modal.classList.contains('active')) {
                modal.classList.remove('active');
            }
        });

        // Prevent modal content clicks from closing it (if needed), 
        // but user asked for "anywhere", so we follow that strictly.

        // Initial load
        if (selector.value) {
            updateReport(selector.value);
        }
    } catch (err) {
        console.error("Initialization failed:", err);
    }
}

document.addEventListener('DOMContentLoaded', init);
