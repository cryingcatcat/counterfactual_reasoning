export function parseGraphToMermaid(g) {
    let mermaidStr = 'graph TD\n';
    const paths = g.split(',').map(p => p.trim());
    
    paths.forEach(path => {
        const tokens = path.split(/\s*(->|<-)\s*/);
        for (let i = 1; i < tokens.length; i += 2) {
            const arrow = tokens[i];
            const left = tokens[i-1];
            const right = tokens[i+1];
            
            const leftMatch = left.match(/([A-Z](?:\?|')?)\s*\((.*?)\)/);
            const rightMatch = right.match(/([A-Z](?:\?|')?)\s*\((.*?)\)/);
            
            const leftId = leftMatch ? leftMatch[1].replace(/[^A-Za-z0-9]/g, '_') : left.replace(/[^A-Za-z0-9]/g, '_');
            const leftLabel = leftMatch ? leftMatch[2] : left;
            const rightId = rightMatch ? rightMatch[1].replace(/[^A-Za-z0-9]/g, '_') : right.replace(/[^A-Za-z0-9]/g, '_');
            const rightLabel = rightMatch ? rightMatch[2] : right;
            
            if (arrow === '->') {
                mermaidStr += `    ${leftId}["${leftLabel}"] --> ${rightId}["${rightLabel}"]\n`;
            } else if (arrow === '<-') {
                mermaidStr += `    ${rightId}["${rightLabel}"] --> ${leftId}["${leftLabel}"]\n`;
            }
        }
    });
    return mermaidStr;
}

export async function fetchExamples() {
    // In a real app, this might be an API call. 
    // Here we'll manually specify the files since we're in a static context.
    const fileNames = [
        'sports_donk_vitality.json',
        'daily_delayed_train.json',
        'daily_lucy_umbrealla.json',
        'health_lucy_gain_weights.json',
        'physics_photoelectric_effect.json'
    ];
    
    const examples = {};
    for (const name of fileNames) {
        const response = await fetch(`./example/${name}`);
        const data = await response.json();
        // The examples are wrapped in a list in the files
        examples[name.replace('.json', '')] = Array.isArray(data) ? data[0] : data;
    }
    return examples;
}

