function sanitizeId(id) {
    return String(id).replace(/[^A-Za-z0-9]/g, '_');
}

function formatLabel(label) {
    // New format uses snake_case; render as readable uppercase.
    return String(label).replace(/_/g, ' ').toUpperCase();
}

/**
 * New-format only.
 * Expected fields:
 * - variable_mapping: { [id: string]: string }
 * - edge_pairs: Array<[string, string]>
 * - bidirected_pairs: Array<[string, string]>
 */
export function normalizeGraphSpec(data) {
    // Some loaders may pass through the outer list wrapper; unwrap it.
    if (Array.isArray(data)) {
        return normalizeGraphSpec(data[0]);
    }
    return {
        variable_mapping: data?.variable_mapping || {},
        edge_pairs: Array.isArray(data?.edge_pairs) ? data.edge_pairs : [],
        bidirected_pairs: Array.isArray(data?.bidirected_pairs) ? data.bidirected_pairs : []
    };
}

export function parseGraphToMermaid(data) {
    const spec = normalizeGraphSpec(data);

    let mermaidStr = 'graph TD\n';
    const mapping = spec.variable_mapping || {};
    const edges = spec.edge_pairs || [];
    const bidirected = spec.bidirected_pairs || [];

    const getLabel = (id) => formatLabel(mapping[id] || id);

    edges.forEach(([u, v]) => {
        const uId = sanitizeId(u);
        const vId = sanitizeId(v);
        mermaidStr += `    ${uId}["${getLabel(u)}"] --> ${vId}["${getLabel(v)}"]\n`;
    });

    // Bidirected confounding (dashed)
    bidirected.forEach(([u, v]) => {
        const uId = sanitizeId(u);
        const vId = sanitizeId(v);
        mermaidStr += `    ${uId}["${getLabel(u)}"] <-.-> ${vId}["${getLabel(v)}"]\n`;
    });

    return mermaidStr;
}

export async function fetchExamples() {
    const manifestUrl = new URL('src/data/manifest.json', window.location.href);
    const response = await fetch(manifestUrl, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText} (${manifestUrl})`);
    }
    const manifest = await response.json();
    
    const examples = {};
    for (const item of manifest) {
        const exampleUrl = new URL(`example/${item.filename}`, window.location.href);
        const res = await fetch(exampleUrl, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`Failed to fetch example: ${res.status} ${res.statusText} (${exampleUrl})`);
        }
        const data = await res.json();
        // The examples are wrapped in a list in the files
        examples[item.id] = Array.isArray(data) ? data[0] : data;
    }
    return { examples, manifest };
}

