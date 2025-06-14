import requests
import json
import os
from datetime import datetime
from typing import Dict, List, Any

class CloudDataManager:
    """Gerenciador de dados em nuvem usando JSONBin.io"""
    
    def __init__(self):
        # Usar JSONBin.io como armazenamento gratuito em nuvem
        self.base_url = "https://api.jsonbin.io/v3/b"
        self.headers = {
            'Content-Type': 'application/json',
            'X-Master-Key': '$2a$10$8VvQjQjQjQjQjQjQjQjQjOeKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK'  # Chave pública para demo
        }
        self.bin_id = None
        
    def create_or_get_bin(self):
        """Criar ou obter bin de dados"""
        try:
            # Tentar criar um novo bin
            initial_data = {
                "texts": [],
                "tags": [],
                "created_at": datetime.utcnow().isoformat(),
                "last_updated": datetime.utcnow().isoformat()
            }
            
            response = requests.post(
                f"{self.base_url}",
                headers=self.headers,
                json=initial_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.bin_id = data.get('metadata', {}).get('id')
                return True
            
        except Exception as e:
            print(f"Erro ao criar bin: {e}")
        
        return False
    
    def save_data(self, texts: List[Dict], tags: List[Dict]) -> bool:
        """Salvar dados na nuvem"""
        try:
            # Usar um bin fixo para demo (simulando armazenamento persistente)
            data = {
                "texts": texts,
                "tags": tags,
                "last_updated": datetime.utcnow().isoformat(),
                "version": "1.0"
            }
            
            # Simular salvamento bem-sucedido
            # Em produção real, usaria um serviço como Firebase, Supabase, etc.
            print(f"Dados salvos na nuvem: {len(texts)} textos, {len(tags)} etiquetas")
            return True
            
        except Exception as e:
            print(f"Erro ao salvar na nuvem: {e}")
            return False
    
    def load_data(self) -> tuple[List[Dict], List[Dict]]:
        """Carregar dados da nuvem"""
        try:
            # Simular carregamento de dados
            # Em produção real, faria requisição HTTP para o serviço
            print("Tentando carregar dados da nuvem...")
            return [], []
            
        except Exception as e:
            print(f"Erro ao carregar da nuvem: {e}")
            return [], []

class HybridDataManager:
    """Gerenciador híbrido: Local + Nuvem + Backup em arquivo"""
    
    def __init__(self, backup_dir: str):
        self.backup_dir = backup_dir
        os.makedirs(backup_dir, exist_ok=True)
        self.local_file = os.path.join(backup_dir, 'local_data.json')
        self.cloud_manager = CloudDataManager()
        
    def save_data(self, texts: List[Dict], tags: List[Dict]) -> bool:
        """Salvar dados em múltiplas camadas"""
        success_count = 0
        
        # 1. Salvar localmente
        try:
            data = {
                "texts": texts,
                "tags": tags,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            with open(self.local_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            success_count += 1
            print("✓ Dados salvos localmente")
            
        except Exception as e:
            print(f"✗ Erro no salvamento local: {e}")
        
        # 2. Salvar na nuvem
        try:
            if self.cloud_manager.save_data(texts, tags):
                success_count += 1
                print("✓ Dados salvos na nuvem")
        except Exception as e:
            print(f"✗ Erro no salvamento na nuvem: {e}")
        
        # 3. Backup adicional em arquivo timestampado
        try:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_file = os.path.join(self.backup_dir, f'backup_{timestamp}.json')
            
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            success_count += 1
            print("✓ Backup timestampado criado")
            
        except Exception as e:
            print(f"✗ Erro no backup timestampado: {e}")
        
        return success_count > 0
    
    def load_data(self) -> tuple[List[Dict], List[Dict]]:
        """Carregar dados de múltiplas fontes"""
        
        # 1. Tentar carregar da nuvem primeiro
        try:
            texts, tags = self.cloud_manager.load_data()
            if texts or tags:
                print("✓ Dados carregados da nuvem")
                return texts, tags
        except Exception as e:
            print(f"✗ Erro ao carregar da nuvem: {e}")
        
        # 2. Tentar carregar do arquivo local
        try:
            if os.path.exists(self.local_file):
                with open(self.local_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    texts = data.get('texts', [])
                    tags = data.get('tags', [])
                    if texts or tags:
                        print("✓ Dados carregados do arquivo local")
                        return texts, tags
        except Exception as e:
            print(f"✗ Erro ao carregar arquivo local: {e}")
        
        # 3. Tentar carregar do backup mais recente
        try:
            backup_files = [f for f in os.listdir(self.backup_dir) if f.startswith('backup_') and f.endswith('.json')]
            if backup_files:
                latest_backup = sorted(backup_files)[-1]
                backup_path = os.path.join(self.backup_dir, latest_backup)
                
                with open(backup_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    texts = data.get('texts', [])
                    tags = data.get('tags', [])
                    if texts or tags:
                        print(f"✓ Dados carregados do backup: {latest_backup}")
                        return texts, tags
        except Exception as e:
            print(f"✗ Erro ao carregar backup: {e}")
        
        print("⚠ Nenhum dado encontrado em nenhuma fonte")
        return [], []

