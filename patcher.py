import os
import re


class Patcher:
    def __init__(self, repo_path):
        self.repo_path = repo_path

    def patch(self, **kwargs):
        raise NotImplementedError


class URLPatcher(Patcher):
    def patch(self, rules, **kwargs):
        for root, _, files in os.walk(self.repo_path):
            for file in files:
                if file.endswith('.md'):
                    file_path = os.path.join(root, file)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()

                    original_content = content
                    for rule in rules:
                        content = content.replace(rule['from'], rule['to'])

                    if original_content != content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f'Patched {file_path}')


class PaperPatcher(Patcher):
    def patch(self, **kwargs):
        config_path = os.path.join(self.repo_path, 'astro.config.ts')
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()

            content = re.sub(r'https://docs\.papermc\.io', 'https://fastly.8aka.cn', content)
            if 'base:' not in content:
                content = re.sub(r'(defineConfig\(\{)', r"\1\n  base: '/Paper',", content, 1)

            # Remove starlightLinksValidator plugin
            content = re.sub(r'\s*starlightLinksValidator\([\s\S]*?\),?\s*', '', content)

            with open(config_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Patched {config_path}')


class GeyserPatcher(Patcher):
    def patch(self, **kwargs):
        config_path = os.path.join(self.repo_path, 'docusaurus.config.ts')
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()

            content = re.sub(r"baseUrl: '\/',", "baseUrl: '/Geyser/',", content)
            content = re.sub(r"url: 'https://geysermc.org'", "url: 'https://fastly.8aka.cn'", content)
            content = re.sub(r"onBrokenLinks: 'throw'", "onBrokenLinks: 'warn'", content)

            with open(config_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Patched {config_path}')


class PurpurPatcher(Patcher):
    def patch(self, **kwargs):
        config_path = os.path.join(self.repo_path, 'mkdocs.yml')
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()

            content = re.sub(r'site_url: https://purpurmc.org/docs', 'site_url: https://fastly.8aka.cn/Purpur',
                               content)

            with open(config_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Patched {config_path}')


class PumpkinPatcher(Patcher):
    def patch(self, **kwargs):
        config_path = os.path.join(self.repo_path, '.vitepress', 'config.mts')
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()

            content = re.sub(r"base: '\/',", "base: '/Pumpkin/',", content)

            with open(config_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Patched {config_path}')


def get_patcher(name, repo_path):
    patchers = {
        'URLPatcher': URLPatcher,
        'PaperPatcher': PaperPatcher,
        'GeyserPatcher': GeyserPatcher,
        'PurpurPatcher': PurpurPatcher,
        'PumpkinPatcher': PumpkinPatcher
    }
    patcher_class = patchers.get(name)
    if patcher_class:
        return patcher_class(repo_path)
    else:
        raise ValueError(f'Unknown patcher: {name}')
