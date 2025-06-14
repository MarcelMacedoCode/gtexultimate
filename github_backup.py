import requests
import json
import base64
from datetime import datetime

class GitHubBackupManager:
    def __init__(self):
        # Token público para demonstração (em produção seria privado)
        self.github_token = None  # Será usado sem token (público)
        self.gist_id = None  # Será criado dinamicamente
        
    def save_to_github(self, data):
        """Salva dados no GitHub Gist"""
        try:
            # Preparar dados para o Gist
            gist_data = {
                "description": f"Gtex Backup - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                "public": False,
                "files": {
                    "gtex_backup.json": {
                        "content": json.dumps(data, ensure_ascii=False, indent=2)
                    }
                }
            }
            
            # Criar ou atualizar Gist
            url = "https://api.github.com/gists"
            headers = {"Accept": "application/vnd.github.v3+json"}
            
            response = requests.post(url, json=gist_data, headers=headers, timeout=10)
            
            if response.status_code == 201:
                gist_info = response.json()
                self.gist_id = gist_info['id']
                return {
                    'success': True,
                    'gist_id': self.gist_id,
                    'url': gist_info['html_url']
                }
            else:
                return {'success': False, 'error': f'GitHub API error: {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def load_from_github(self, gist_id):
        """Carrega dados do GitHub Gist"""
        try:
            url = f"https://api.github.com/gists/{gist_id}"
            headers = {"Accept": "application/vnd.github.v3+json"}
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                gist_data = response.json()
                file_content = gist_data['files']['gtex_backup.json']['content']
                return {
                    'success': True,
                    'data': json.loads(file_content)
                }
            else:
                return {'success': False, 'error': f'Gist not found: {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}

# Instância global
github_backup = GitHubBackupManager()

