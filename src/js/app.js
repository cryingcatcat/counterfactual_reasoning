import { parseGraphToMermaid, fetchExamples, normalizeGraphSpec } from './utils.js';
import { highlightDifferences } from './diff.js';

let allExamples = {};

async function updateReport(key) {
    const raw = allExamples[key];
    const data = Array.isArray(raw) ? raw[0] : raw;
    if (!data) {
        console.warn(`No data found for key: ${key}`);
        return;
    }

    try {
        // Update text content with backward compatibility
        document.getElementById('factual-story').innerText = data.T || "";
        
        const graphSpec = normalizeGraphSpec(data);

        // Map intervention variable ID to its label (works for both formats)
        let vLabel = data.V || "";
        if (graphSpec.variable_mapping && graphSpec.variable_mapping[data.V]) {
            vLabel = `${data.V} (${String(graphSpec.variable_mapping[data.V]).replace(/_/g, ' ')})`;
        }
        document.getElementById('intervention-variable').innerText = vLabel;
        
        const cfQuestion = document.getElementById('cf-question');
        cfQuestion.innerText = data.Q || "";
        
        // Dynamically adjust font size for the query based on length
        const qLength = (data.Q || "").length;
        if (qLength > 200) {
            cfQuestion.style.fontSize = '1.1rem';
        } else if (qLength > 120) {
            cfQuestion.style.fontSize = '1.25rem';
        } else if (qLength > 80) {
            cfQuestion.style.fontSize = '1.4rem';
        } else {
            cfQuestion.style.fontSize = '1.6rem';
        }

        document.getElementById('math-query').innerText = data.M || "";
        
        // Highlight differences between S and S_prime (new format only)
        const diffs = highlightDifferences(data.S || "", data.S_prime || "");
        document.getElementById('response-s').innerHTML = diffs.html1;
        document.getElementById('response-s-prime').innerHTML = diffs.html2;

        const modelInfo = Array.isArray(data.model) ? data.model.join(', ') : (data.model || "Unknown Model");
        document.getElementById('model-note').innerText = `Analysis performed by: ${modelInfo}`;

        const errorType = data.error_type || data.ErrorType;
        let fullComment = data.comment || data.Error || "";
        const typePrefix = errorType ? `Type ${errorType}:` : "";
        
        if (typePrefix && !fullComment.trim().startsWith(typePrefix)) {
            fullComment = `${typePrefix} ${fullComment}`;
        }
        document.getElementById('error-description').innerText = fullComment;

        // Construct a text representation for the specification view (normalized)
        const mappingText = Object.entries(graphSpec.variable_mapping || {})
            .map(([id, label]) => `${id} (${label})`)
            .join(', ');
        const edgesText = (graphSpec.edge_pairs || [])
            .map(([u, v]) => `${u} -> ${v}`)
            .join(', ');
        const biText = (graphSpec.bidirected_pairs || [])
            .map(([u, v]) => `${u} <---> ${v}`)
            .join(', ');

        const rawText = `Variables: ${mappingText}\nEdges: ${edgesText}${biText ? '\nBidirectional: ' + biText : ''}`;
        document.getElementById('raw-graph-text').innerText = rawText;

        // Force a reflow to restart text entry animations
        const animatedTexts = document.querySelectorAll('.factual-text, .cf-query-text');
        animatedTexts.forEach(el => {
            el.style.animation = 'none';
            el.offsetHeight; /* trigger reflow */
            el.style.animation = null;
        });

        // Render Diagram
        const container = document.getElementById('mermaid-container');
        const mermaidDefinition = parseGraphToMermaid(data);
        
        // Clear previous and set new
        container.innerHTML = `<pre class="mermaid" id="mermaid-viz">${mermaidDefinition}</pre>`;
        
        // Initialize mermaid (ensure it's done)
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

        // Mermaid sometimes applies clip-paths that don't play well with our zoom/pan,
        // resulting in the graph being visible only inside a small clipped rectangle.
        // Remove them so zoom/pan reveals the full diagram within the container viewport.
        const svgEl = container.querySelector('svg');
        if (svgEl) {
            svgEl.style.overflow = 'visible';
            svgEl.querySelectorAll('[clip-path]').forEach(el => el.removeAttribute('clip-path'));
            svgEl.querySelectorAll('[mask]').forEach(el => el.removeAttribute('mask'));
        }

        // Small delay to ensure SVG is in DOM and has dimensions
        setTimeout(() => {
            const svg = d3.select(container).select('svg');
            if (svg.empty()) return;

            svg.attr('width', '100%')
                .attr('height', '100%')
                .style('max-width', 'none')
                .style('height', '100%')
                .style('overflow', 'visible');

            // Mermaid sometimes uses multiple top-level nodes (e.g. <defs> + one or more <g>).
            // If we only zoom the first <g>, we can accidentally exclude parts of the diagram.
            // Create a zoom layer and move ALL top-level non-<defs> nodes into it.
            let zoomLayer = svg.select('g.zoom-layer');
            if (zoomLayer.empty()) {
                zoomLayer = svg.append('g').attr('class', 'zoom-layer');

                const svgNode = svg.node();
                const layerNode = zoomLayer.node();
                if (!svgNode || !layerNode) return;

                // Move all children except <defs> and the zoom layer itself
                const children = Array.from(svgNode.children);
                for (const child of children) {
                    const tag = (child.tagName || '').toLowerCase();
                    if (tag === 'defs') continue;
                    if (child === layerNode) continue;
                    layerNode.appendChild(child);
                }
            }

            // Fit using screen-space rects (more robust than getBBox across Mermaid SVG variations)
            const getFitTransform = () => {
                const layerNode = zoomLayer.node();
                const svgNode = svg.node();
                if (!layerNode || !svgNode) return d3.zoomIdentity;

                // Ensure we're measuring the untransformed layout
                zoomLayer.attr('transform', null);

                const layerRect = layerNode.getBoundingClientRect();
                const svgRect = svgNode.getBoundingClientRect();

                if (layerRect.width <= 0 || layerRect.height <= 0 || svgRect.width <= 0 || svgRect.height <= 0) {
                    return d3.zoomIdentity;
                }

                const fitScale = 0.95 * Math.min(svgRect.width / layerRect.width, svgRect.height / layerRect.height);
                const scale = Math.min(1, fitScale);

                const layerCx = layerRect.left + layerRect.width / 2;
                const layerCy = layerRect.top + layerRect.height / 2;
                const svgCx = svgRect.left + svgRect.width / 2;
                const svgCy = svgRect.top + svgRect.height / 2;

                // d3.zoom transform translation is in screen pixels: screen = k * p + t
                const dx = svgCx - layerCx;
                const dy = svgCy - layerCy;

                return d3.zoomIdentity.translate(dx, dy).scale(scale);
            };

            const zoom = d3.zoom()
                .scaleExtent([0.1, 10])
                .filter(event => event.type !== 'wheel')
                .on('zoom', (event) => {
                    zoomLayer.attr('transform', event.transform);
                });

            svg.call(zoom);

            // Initial centering and fitting
            const initialTransform = getFitTransform();
            svg.call(zoom.transform, initialTransform);

            // Manual Zoom Button Logic
            document.getElementById('zoom-in').onclick = (e) => {
                e.preventDefault();
                svg.transition().duration(300).call(zoom.scaleBy, 1.3);
            };

            document.getElementById('zoom-out').onclick = (e) => {
                e.preventDefault();
                svg.transition().duration(300).call(zoom.scaleBy, 0.7);
            };

            document.getElementById('zoom-reset').onclick = (e) => {
                e.preventDefault();
                // Re-fit based on current container size
                const refit = getFitTransform();
                svg.transition().duration(500).call(zoom.transform, refit);
            };
        }, 50);

    } catch (err) {
        console.error("Error updating report:", err);
    }
}

async function init() {
    try {
        const { examples, manifest } = await fetchExamples();
        allExamples = examples;
        
        const selector = document.getElementById('example-selector');
        
        // Clear existing options
        selector.innerHTML = '';
        
        // Group by type
        const groups = {};
        manifest.forEach(item => {
            if (!groups[item.type]) {
                groups[item.type] = [];
            }
            groups[item.type].push(item);
        });
        
        // Populate selector with optgroups
        Object.keys(groups).sort().forEach(type => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = type.charAt(0).toUpperCase() + type.slice(1);
            
            groups[type].forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.name;
                optgroup.appendChild(option);
            });
            
            selector.appendChild(optgroup);
        });

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
        const tip = document.querySelector('.instruction-tip');
        if (tip) {
            tip.textContent = `Data load failed (likely 404). Please run a local server from the project root (e.g. "python generate_reports.py") and open http://localhost:3000/`;
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
