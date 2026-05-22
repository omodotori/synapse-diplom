import os
import json

root_dir = r"c:\synapse\Synapse\Synapse-main\Synapse-main"
exclude_dirs = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', 'env', '.idea', '.vscode', 'usr', 'docker', 'tests', 'vendor'}
# We probably should exclude webui/vendor if it exists.

target_extensions = {'.md', '.py', '.html', '.js'}
files_to_translate = {
    "docs": [],
    "prompts": [],
    "python_backend": [],
    "webui": [],
    "other_md": []
}

for dirpath, dirnames, filenames in os.walk(root_dir):
    dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
    
    # Also exclude vendor inside webui
    if 'vendor' in dirnames:
        dirnames.remove('vendor')

    for f in filenames:
        ext = os.path.splitext(f)[1].lower()
        if ext in target_extensions:
            filepath = os.path.join(dirpath, f)
            rel_path = os.path.relpath(filepath, root_dir)
            rel_path = rel_path.replace("\\", "/")
            
            # categorize
            if rel_path.startswith("docs/"):
                files_to_translate["docs"].append(rel_path)
            elif "prompts/" in rel_path or rel_path.startswith("agents/"):
                if ext == '.md':
                    files_to_translate["prompts"].append(rel_path)
                elif ext == '.py':
                    files_to_translate["python_backend"].append(rel_path)
            elif rel_path.startswith("webui/"):
                if "vendor" not in rel_path:
                    files_to_translate["webui"].append(rel_path)
            elif rel_path.startswith("api/") or rel_path.startswith("helpers/") or rel_path.startswith("tools/") or rel_path.startswith("plugins/") or rel_path.startswith("extensions/"):
                if ext == '.py':
                    files_to_translate["python_backend"].append(rel_path)
            else:
                if ext == '.md':
                    files_to_translate["other_md"].append(rel_path)
                elif ext == '.py':
                    files_to_translate["python_backend"].append(rel_path)

# Save report
with open(os.path.join(root_dir, "translation_targets.json"), "w", encoding="utf-8") as out:
    json.dump(files_to_translate, out, indent=4)
print(f"Docs: {len(files_to_translate['docs'])}")
print(f"Prompts: {len(files_to_translate['prompts'])}")
print(f"Python: {len(files_to_translate['python_backend'])}")
print(f"WebUI: {len(files_to_translate['webui'])}")
print(f"Other MD: {len(files_to_translate['other_md'])}")
