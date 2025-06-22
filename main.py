import json
import os
import shutil
import subprocess
from patcher import get_patcher

def run_command(command, cwd):
    print(f'Running command: "{command}" in "{cwd}"')
    subprocess.run(command, shell=True, check=True, cwd=cwd)

def generate_index_html(config):
    build_dir = 'build'
    if not os.path.exists(build_dir):
        os.makedirs(build_dir)

    index_path = os.path.join(build_dir, 'index.html')

    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文档加速站</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');

        body {
            font-family: 'Inter', sans-serif;
            background-color: #f4f7f9;
            color: #333;
            margin: 0;
            padding: 2em;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        .container {
            max-width: 800px;
            width: 100%;
            text-align: center;
        }

        h1 {
            color: #2c3e50;
            margin-bottom: 1.5em;
        }

        ul {
            list-style-type: none;
            padding: 0;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5em;
        }

        li {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        
        li:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
        }

        a {
            display: block;
            padding: 2em;
            text-decoration: none;
            color: #3498db;
            font-size: 1.2em;
            font-weight: bold;
        }
        
        footer {
            margin-top: 3em;
            color: #7f8c8d;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>文档加速列表s</h1>
        <ul>
"""

    for name in config:
        html_content += f'        <li><a href="./{name}/">{name}</a></li>\n'

    html_content += """
        </ul>
        <footer>
            <p>由 8aka-Team 提供</p>
        </footer>
    </div>
</body>
</html>
"""

    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f'Generated index.html at {index_path}')

def main():
    if not os.path.exists('repos'):
        os.makedirs('repos')

    with open('fastly.json', 'r', encoding='utf-8') as f:
        config = json.load(f)

    for name, project in config.items():
        print(f'Processing {name}...')
        repo_path = os.path.join('repos', name)

        if not os.path.exists(repo_path):
            run_command(f'git clone {project["repo"]} {repo_path} --depth 1', '.')
        
        run_command(f'git fetch', repo_path)
        run_command(f'git checkout {project["commit"]}', repo_path)
        run_command(f'git pull', repo_path)

        # Patch files before installing dependencies
        for patcher_config in project.get('patcher', []):
            patcher_type = patcher_config.pop('type')
            patcher = get_patcher(patcher_type, repo_path)
            patcher.patch(**patcher_config)

        run_command(project['install'], repo_path)
        run_command(project['build'], repo_path)

        output_path = os.path.join(repo_path, project['output'])
        target_path = os.path.join('build', name)

        if os.path.exists(target_path):
            shutil.rmtree(target_path)
        
        shutil.move(output_path, target_path)
        print(f'Moved build output to {target_path}')

    generate_index_html(config)

        # Further processing like moving static files can be added here

if __name__ == '__main__':
    main()