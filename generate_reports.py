import json
import os
import re

def parse_graph_to_mermaid(g):
    mermaid_str = 'graph TD\\n'
    paths = [p.strip() for p in g.split(',')]
    
    for path in paths:
        nodes = [n.strip() for n in path.split('->')]
        for i in range(len(nodes) - 1):
            from_node = nodes[i]
            to_node = nodes[i+1]
            
            from_match = re.search(r'([A-Z])\s*\((.*?)\)', from_node)
            to_match = re.search(r'([A-Z])\s*\((.*?)\)', to_node)
            
            from_id = from_match.group(1) if from_match else from_node
            from_label = from_match.group(2) if from_match else from_node
            to_id = to_match.group(1) if to_match else to_node
            to_label = to_match.group(2) if to_match else to_node
            
            mermaid_str += f'    {from_id}["{from_label}"] --> {to_id}["{to_label}"]\\n'
    return mermaid_str

def generate_html_report(json_data, output_path):
    # If json_data is a list, take the first element (based on the example files)
    if isinstance(json_data, list):
        data = json_data[0]
    else:
        data = json_data

    # Use a template string for the HTML
    template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Causal Inference Report</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .mermaid {{ display: flex; justify-content: center; background-color: #ffffff; padding: 20px; border-radius: 12px; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06); }}
        .node rect {{ fill: #eef2ff !important; stroke: #4f46e5 !important; stroke-width: 2px !important; }}
        .edgePath path {{ stroke: #6366f1 !important; stroke-width: 2px !important; }}
    </style>
</head>
<body class="bg-slate-50 text-slate-900 font-sans antialiased">
    <div class="max-w-5xl mx-auto py-12 px-6">
        <header class="mb-12 border-b border-slate-200 pb-8 text-center">
            <h1 class="text-5xl font-black text-slate-800 tracking-tight mb-4">
                Causal Inference <span class="text-indigo-600">Analysis Report</span>
            </h1>
            <p class="text-xl text-slate-500 max-w-2xl mx-auto italic">
                {os.path.basename(output_path).replace('.html', '').replace('_', ' ').title()}
            </p>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 space-y-8">
                <section class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="px-6 py-4 bg-indigo-600">
                        <h3 class="text-lg font-bold text-white flex items-center">
                            Causal Structure (G)
                        </h3>
                    </div>
                    <div class="p-6">
                        <div id="mermaid-container" class="mermaid mb-4">
                            <pre class="mermaid">
{parse_graph_to_mermaid(data['G'])}
                            </pre>
                        </div>
                        <div class="text-xs text-slate-400 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100 overflow-x-auto">
                            <span class="font-bold text-slate-500">Raw Graph:</span>
                            <div class="mt-1">{data['G']}</div>
                        </div>
                    </div>
                </section>

                <section class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="px-6 py-4 bg-amber-500">
                        <h3 class="text-lg font-bold text-white flex items-center">
                            Intervention & Query
                        </h3>
                    </div>
                    <div class="p-6 space-y-4">
                        <div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Intervention (V)</span>
                            <p class="mt-1 font-semibold text-slate-700">{data['V']}</p>
                        </div>
                        <div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Formalism (M)</span>
                            <p class="mt-1 font-mono text-xs text-indigo-600 bg-indigo-50 p-2 rounded">{data['M']}</p>
                        </div>
                    </div>
                </section>
            </div>

            <div class="lg:col-span-2 space-y-8">
                <section class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="px-6 py-4 bg-slate-800">
                        <h3 class="text-lg font-bold text-white">Factual Story (T)</h3>
                    </div>
                    <div class="p-8 prose prose-slate">
                        <p class="text-lg leading-relaxed text-slate-700 italic">{data['T']}</p>
                    </div>
                </section>

                <section class="bg-white rounded-2xl shadow-sm border border-indigo-200 overflow-hidden ring-4 ring-indigo-50">
                    <div class="px-6 py-4 bg-indigo-50">
                        <h3 class="text-lg font-bold text-indigo-900">Counterfactual Query (Q)</h3>
                    </div>
                    <div class="p-8 bg-indigo-50/30">
                        <p class="text-xl font-medium text-slate-800 leading-snug">{data['Q']}</p>
                    </div>
                </section>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden">
                        <div class="px-4 py-3 bg-emerald-500 text-white text-sm font-bold uppercase tracking-widest">Response S</div>
                        <div class="p-6">
                            <p class="text-slate-600 leading-relaxed">{data['S']}</p>
                        </div>
                    </div>
                    <div class="bg-white rounded-2xl shadow-sm border border-rose-200 overflow-hidden">
                        <div class="px-4 py-3 bg-rose-500 text-white text-sm font-bold uppercase tracking-widest">Response S'</div>
                        <div class="p-6">
                            <p class="text-slate-600 leading-relaxed">{data['S' if "S'" not in data else "S'"]}</p>
                        </div>
                    </div>
                </div>

                <section class="bg-rose-50 rounded-2xl shadow-sm border border-rose-200 overflow-hidden">
                    <div class="px-6 py-4 bg-rose-100 border-b border-rose-200">
                        <h3 class="text-lg font-bold text-rose-900">Error Analysis</h3>
                    </div>
                    <div class="p-8">
                        <p class="text-rose-800 font-semibold text-lg leading-relaxed">{data['Error']}</p>
                    </div>
                </section>
            </div>
        </div>
    </div>
    <script>
        mermaid.initialize({{ 
            startOnLoad: true,
            theme: 'base',
            themeVariables: {{
                primaryColor: '#eef2ff',
                primaryTextColor: '#4f46e5',
                primaryBorderColor: '#4f46e5',
                lineColor: '#6366f1',
                secondaryColor: '#f8fafc',
                tertiaryColor: '#ffffff'
            }}
        }});
    </script>
</body>
</html>
"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(template)

def main():
    example_dir = 'example'
    output_dir = 'reports'
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    for filename in os.listdir(example_dir):
        if filename.endswith('.json'):
            with open(os.path.join(example_dir, filename), 'r', encoding='utf-8') as f:
                data = json.load(f)
                output_filename = filename.replace('.json', '.html')
                output_path = os.path.join(output_dir, output_filename)
                generate_html_report(data, output_path)
                print(f"Generated report: {output_path}")

if __name__ == "__main__":
    main()

