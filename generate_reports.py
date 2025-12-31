import json
import os
import re
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

def _sanitize_id(x: str) -> str:
    return re.sub(r'[^A-Za-z0-9]', '_', str(x))

def _format_label(x: str) -> str:
    return str(x).replace('_', ' ').upper()

def parse_graph_to_mermaid(data):
    """
    New-format only.
    Expects:
      - variable_mapping: { "A": "weather", ... }
      - edge_pairs: [["A","B"], ...]
      - bidirected_pairs: [["B","D"], ...]
    """
    mermaid_str = 'graph TD\\n'
    mapping = data.get('variable_mapping', {}) or {}
    edges = data.get('edge_pairs', []) or []
    bidirected = data.get('bidirected_pairs', []) or []

    def label(var_id: str) -> str:
        return _format_label(mapping.get(var_id, var_id))

    for u, v in edges:
        mermaid_str += f'    {_sanitize_id(u)}["{label(u)}"] --> {_sanitize_id(v)}["{label(v)}"]\\n'

    # Bidirected confounding (dashed)
    for u, v in bidirected:
        mermaid_str += f'    {_sanitize_id(u)}["{label(u)}"] <-.-> {_sanitize_id(v)}["{label(v)}"]\\n'

    return mermaid_str

def generate_html_report(json_data, output_path):
    if isinstance(json_data, list):
        data = json_data[0]
    else:
        data = json_data

    # New-format only: build a readable specification block once, then inject into template.
    vm = data.get('variable_mapping', {}) or {}
    ep = data.get('edge_pairs', []) or []
    bp = data.get('bidirected_pairs', []) or []

    variables_line = "Variables: " + ", ".join([f"{k} ({v})" for k, v in vm.items()])
    edges_line = "Edges: " + ", ".join([f"{u} -> {v}" for u, v in ep])
    bidirected_line = ""
    if bp:
        bidirected_line = "Bidirectional: " + ", ".join([f"{u} <---> {v}" for u, v in bp])

    spec_lines = [variables_line, edges_line]
    if bidirected_line:
        spec_lines.append(bidirected_line)
    spec_text = "\n".join(spec_lines)

    # Handle error analysis text carefully to avoid double-prefixing
    error_type = data.get('error_type')
    comment = data.get('comment', '')
    type_prefix = f"Type {error_type}:" if error_type else ""
    if type_prefix and not str(comment).strip().startswith(type_prefix):
        error_text = f"{type_prefix} {comment}"
    else:
        error_text = comment

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
{parse_graph_to_mermaid(data)}
                            </pre>
                        </div>
                        <div class="text-xs text-slate-400 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100 overflow-x-auto whitespace-pre-wrap">
                            <span class="font-bold text-slate-500">Specification:</span>
                            <div class="mt-1">{spec_text}</div>
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
                            <p class="mt-1 font-semibold text-slate-700">{data.get('V', '')}</p>
                        </div>
                        <div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Formalism (M)</span>
                            <p class="mt-1 font-mono text-xs text-indigo-600 bg-indigo-50 p-2 rounded">{data.get('M', '')}</p>
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
                        <p class="text-lg leading-relaxed text-slate-700 italic">{data.get('T', '')}</p>
                    </div>
                </section>

                <section class="bg-white rounded-2xl shadow-sm border border-indigo-200 overflow-hidden ring-4 ring-indigo-50">
                    <div class="px-6 py-4 bg-indigo-50">
                        <h3 class="text-lg font-bold text-indigo-900">Counterfactual Query (Q)</h3>
                    </div>
                    <div class="p-8 bg-indigo-50/30">
                        <p class="text-xl font-medium text-slate-800 leading-snug">{data.get('Q', '')}</p>
                    </div>
                </section>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden">
                        <div class="px-4 py-3 bg-emerald-500 text-white text-sm font-bold uppercase tracking-widest">Response S</div>
                        <div class="p-6">
                            <p class="text-slate-600 leading-relaxed">{data.get('S', '')}</p>
                        </div>
                    </div>
                    <div class="bg-white rounded-2xl shadow-sm border border-rose-200 overflow-hidden">
                        <div class="px-4 py-3 bg-rose-500 text-white text-sm font-bold uppercase tracking-widest">Response S'</div>
                        <div class="p-6">
                            <p class="text-slate-600 leading-relaxed">{data.get('S_prime', '')}</p>
                        </div>
                    </div>
                </div>

                <section class="bg-rose-50 rounded-2xl shadow-sm border border-rose-200 overflow-hidden">
                    <div class="px-6 py-4 bg-rose-100 border-b border-rose-200">
                        <h3 class="text-lg font-bold text-rose-900">Error Analysis</h3>
                    </div>
                    <div class="p-8">
                        <p class="text-rose-800 font-semibold text-lg leading-relaxed">{error_text}</p>
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

def generate_manifest(example_dir, manifest_path):
    examples = []
    if not os.path.exists(example_dir):
        return []
    for filename in os.listdir(example_dir):
        if filename.endswith('.json'):
            file_type = filename.split('_')[0]
            display_name = filename.replace('.json', '').replace('_', ' ').title()
            display_name = re.sub(f'^{file_type.title()}\\s*', '', display_name)
            examples.append({
                "id": filename.replace('.json', ''),
                "filename": filename,
                "type": file_type,
                "name": display_name
            })
    examples.sort(key=lambda x: (x['type'], x['name']))
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(examples, f, indent=4)
    return examples

class AutoUpdateHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Intercept manifest requests to update it on the fly
        if self.path == '/src/data/manifest.json':
            print("Detected manifest request, refreshing from 'example/' folder...")
            generate_manifest('example', 'src/data/manifest.json')
        return super().do_GET()

import socket

def start_server(port=3000):
    while True:
        try:
            server_address = ('', port)
            httpd = HTTPServer(server_address, AutoUpdateHandler)
            print(f"\n🚀 Dashboard available at: http://localhost:{port}")
            print("✨ Manifest will automatically update whenever you refresh the page.")
            print("Press Ctrl+C to stop.\n")
            httpd.serve_forever()
            break
        except OSError:
            print(f"⚠️ Port {port} is in use, trying {port + 1}...")
            port += 1

def main():
    example_dir = 'example'
    output_dir = 'reports'
    manifest_path = 'src/data/manifest.json'
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    # Initial generation
    generate_manifest(example_dir, manifest_path)
    
    # Check if we should serve or just generate
    if "--no-serve" in sys.argv:
        for filename in os.listdir(example_dir):
            if filename.endswith('.json'):
                with open(os.path.join(example_dir, filename), 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    output_filename = filename.replace('.json', '.html')
                    output_path = os.path.join(output_dir, output_filename)
                    generate_html_report(data, output_path)
                    print(f"Generated report: {output_path}")
    else:
        start_server()

if __name__ == "__main__":
    main()