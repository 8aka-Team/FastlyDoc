import json
import os
import shutil
import subprocess
from patcher import get_patcher

def run_command(command, cwd):
    print(f'Running command: "{command}" in "{cwd}"')
    subprocess.run(command, shell=True, check=True, cwd=cwd)

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

        # Further processing like moving static files can be added here

if __name__ == '__main__':
    main()