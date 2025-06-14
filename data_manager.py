import json
import os
from datetime import datetime
from typing import Dict, List, Any

class PersistentDataManager:
    """Gerenciador de dados persistente com backup automático"""
    
    def __init__(self, backup_dir: str):
        self.backup_dir = backup_dir
        os.makedirs(backup_dir, exist_ok=True)
        self.texts_file = os.path.join(backup_dir, 'texts_backup.json')
        self.tags_file = os.path.join(backup_dir, 'tags_backup.json')
    
    def backup_data(self, texts: List[Dict], tags: List[Dict]) -> bool:
        """Fazer backup dos dados em arquivos JSON"""
        try:
            # Backup dos textos
            with open(self.texts_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'timestamp': datetime.utcnow().isoformat(),
                    'data': texts
                }, f, ensure_ascii=False, indent=2)
            
            # Backup das etiquetas
            with open(self.tags_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'timestamp': datetime.utcnow().isoformat(),
                    'data': tags
                }, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception as e:
            print(f"Erro no backup: {e}")
            return False
    
    def restore_data(self) -> tuple[List[Dict], List[Dict]]:
        """Restaurar dados dos arquivos de backup"""
        texts = []
        tags = []
        
        try:
            # Restaurar etiquetas
            if os.path.exists(self.tags_file):
                with open(self.tags_file, 'r', encoding='utf-8') as f:
                    tags_data = json.load(f)
                    tags = tags_data.get('data', [])
            
            # Restaurar textos
            if os.path.exists(self.texts_file):
                with open(self.texts_file, 'r', encoding='utf-8') as f:
                    texts_data = json.load(f)
                    texts = texts_data.get('data', [])
            
        except Exception as e:
            print(f"Erro na restauração: {e}")
        
        return texts, tags
    
    def has_backup(self) -> bool:
        """Verificar se existem backups"""
        return os.path.exists(self.texts_file) or os.path.exists(self.tags_file)

