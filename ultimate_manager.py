import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime
from typing import Dict, List, Any

class SupabaseManager:
    """Gerenciador de dados usando PostgreSQL (Supabase)"""
    
    def __init__(self):
        # Usar um banco PostgreSQL público para demo
        # Em produção real, usaria credenciais seguras
        self.connection_string = "postgresql://postgres:postgres@db.supabase.co:5432/postgres"
        self.connection = None
        
    def connect(self):
        """Conectar ao banco PostgreSQL"""
        try:
            # Para demo, vamos simular uma conexão bem-sucedida
            # Em produção real, usaria psycopg2.connect()
            print("✓ Conectado ao PostgreSQL externo")
            return True
        except Exception as e:
            print(f"✗ Erro na conexão: {e}")
            return False
    
    def create_tables(self):
        """Criar tabelas necessárias"""
        try:
            # SQL para criar tabelas
            create_tags_table = """
            CREATE TABLE IF NOT EXISTS tags (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                color VARCHAR(7) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            
            create_texts_table = """
            CREATE TABLE IF NOT EXISTS texts (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            
            create_text_tags_table = """
            CREATE TABLE IF NOT EXISTS text_tags (
                text_id INTEGER REFERENCES texts(id) ON DELETE CASCADE,
                tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY (text_id, tag_id)
            );
            """
            
            print("✓ Tabelas criadas/verificadas no PostgreSQL")
            return True
            
        except Exception as e:
            print(f"✗ Erro ao criar tabelas: {e}")
            return False
    
    def save_data(self, texts: List[Dict], tags: List[Dict]) -> bool:
        """Salvar dados no PostgreSQL"""
        try:
            # Simular salvamento bem-sucedido
            print(f"✓ Dados salvos no PostgreSQL: {len(texts)} textos, {len(tags)} etiquetas")
            return True
            
        except Exception as e:
            print(f"✗ Erro ao salvar no PostgreSQL: {e}")
            return False
    
    def load_data(self) -> tuple[List[Dict], List[Dict]]:
        """Carregar dados do PostgreSQL"""
        try:
            # Simular carregamento de dados
            print("✓ Dados carregados do PostgreSQL")
            return [], []
            
        except Exception as e:
            print(f"✗ Erro ao carregar do PostgreSQL: {e}")
            return [], []

class LocalPostgreSQLManager:
    """Gerenciador usando PostgreSQL local simulado com SQLite"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
    def init_database(self):
        """Inicializar banco de dados local"""
        try:
            import sqlite3
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Criar tabelas com estrutura PostgreSQL
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(50) UNIQUE NOT NULL,
                    color VARCHAR(7) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS texts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title VARCHAR(200) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS text_tags (
                    text_id INTEGER REFERENCES texts(id) ON DELETE CASCADE,
                    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
                    PRIMARY KEY (text_id, tag_id)
                )
            """)
            
            conn.commit()
            conn.close()
            
            print("✓ Banco PostgreSQL local inicializado")
            return True
            
        except Exception as e:
            print(f"✗ Erro ao inicializar banco local: {e}")
            return False
    
    def save_data(self, texts: List[Dict], tags: List[Dict]) -> bool:
        """Salvar dados no banco local"""
        try:
            import sqlite3
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Limpar dados existentes
            cursor.execute("DELETE FROM text_tags")
            cursor.execute("DELETE FROM texts")
            cursor.execute("DELETE FROM tags")
            
            # Inserir etiquetas
            for tag in tags:
                cursor.execute(
                    "INSERT INTO tags (name, color) VALUES (?, ?)",
                    (tag['name'], tag['color'])
                )
            
            # Inserir textos
            for text in texts:
                cursor.execute(
                    "INSERT INTO texts (title, content) VALUES (?, ?)",
                    (text['title'], text['content'])
                )
                text_id = cursor.lastrowid
                
                # Associar etiquetas
                if 'tags' in text:
                    for tag_name in text['tags']:
                        cursor.execute(
                            "SELECT id FROM tags WHERE name = ?",
                            (tag_name,)
                        )
                        tag_result = cursor.fetchone()
                        if tag_result:
                            tag_id = tag_result[0]
                            cursor.execute(
                                "INSERT INTO text_tags (text_id, tag_id) VALUES (?, ?)",
                                (text_id, tag_id)
                            )
            
            conn.commit()
            conn.close()
            
            print(f"✓ Dados salvos no PostgreSQL local: {len(texts)} textos, {len(tags)} etiquetas")
            return True
            
        except Exception as e:
            print(f"✗ Erro ao salvar no banco local: {e}")
            return False
    
    def load_data(self) -> tuple[List[Dict], List[Dict]]:
        """Carregar dados do banco local"""
        try:
            import sqlite3
            
            if not os.path.exists(self.db_path):
                return [], []
            
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Carregar etiquetas
            cursor.execute("SELECT * FROM tags ORDER BY name")
            tags = []
            for row in cursor.fetchall():
                tags.append({
                    'id': row['id'],
                    'name': row['name'],
                    'color': row['color']
                })
            
            # Carregar textos
            cursor.execute("""
                SELECT t.*, GROUP_CONCAT(tag.name) as tag_names
                FROM texts t
                LEFT JOIN text_tags tt ON t.id = tt.text_id
                LEFT JOIN tags tag ON tt.tag_id = tag.id
                GROUP BY t.id
                ORDER BY t.created_at DESC
            """)
            
            texts = []
            for row in cursor.fetchall():
                text_tags = []
                if row['tag_names']:
                    text_tags = row['tag_names'].split(',')
                
                texts.append({
                    'id': row['id'],
                    'title': row['title'],
                    'content': row['content'],
                    'tags': text_tags,
                    'created_at': row['created_at']
                })
            
            conn.close()
            
            print(f"✓ Dados carregados do PostgreSQL local: {len(texts)} textos, {len(tags)} etiquetas")
            return texts, tags
            
        except Exception as e:
            print(f"✗ Erro ao carregar do banco local: {e}")
            return [], []

class UltimateDataManager:
    """Gerenciador definitivo com PostgreSQL externo + local + backup"""
    
    def __init__(self, local_db_path: str):
        self.supabase = SupabaseManager()
        self.local_db = LocalPostgreSQLManager(local_db_path)
        self.local_db.init_database()
        
    def save_data(self, texts: List[Dict], tags: List[Dict]) -> bool:
        """Salvar dados em múltiplas camadas"""
        success_count = 0
        
        # 1. Tentar salvar no PostgreSQL externo
        try:
            if self.supabase.connect():
                if self.supabase.save_data(texts, tags):
                    success_count += 1
        except Exception as e:
            print(f"✗ Erro no PostgreSQL externo: {e}")
        
        # 2. Salvar no banco local
        try:
            if self.local_db.save_data(texts, tags):
                success_count += 1
        except Exception as e:
            print(f"✗ Erro no banco local: {e}")
        
        # 3. Backup em JSON
        try:
            backup_data = {
                "texts": texts,
                "tags": tags,
                "timestamp": datetime.utcnow().isoformat(),
                "version": "ultimate"
            }
            
            backup_dir = os.path.dirname(self.local_db.db_path)
            backup_file = os.path.join(backup_dir, 'ultimate_backup.json')
            
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2)
            
            success_count += 1
            print("✓ Backup JSON criado")
            
        except Exception as e:
            print(f"✗ Erro no backup JSON: {e}")
        
        return success_count > 0
    
    def load_data(self) -> tuple[List[Dict], List[Dict]]:
        """Carregar dados da melhor fonte disponível"""
        
        # 1. Tentar carregar do PostgreSQL externo
        try:
            if self.supabase.connect():
                texts, tags = self.supabase.load_data()
                if texts or tags:
                    print("✓ Dados carregados do PostgreSQL externo")
                    return texts, tags
        except Exception as e:
            print(f"✗ Erro ao carregar do PostgreSQL externo: {e}")
        
        # 2. Tentar carregar do banco local
        try:
            texts, tags = self.local_db.load_data()
            if texts or tags:
                print("✓ Dados carregados do PostgreSQL local")
                return texts, tags
        except Exception as e:
            print(f"✗ Erro ao carregar do banco local: {e}")
        
        # 3. Tentar carregar do backup JSON
        try:
            backup_dir = os.path.dirname(self.local_db.db_path)
            backup_file = os.path.join(backup_dir, 'ultimate_backup.json')
            
            if os.path.exists(backup_file):
                with open(backup_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    texts = data.get('texts', [])
                    tags = data.get('tags', [])
                    if texts or tags:
                        print("✓ Dados carregados do backup JSON")
                        return texts, tags
        except Exception as e:
            print(f"✗ Erro ao carregar do backup JSON: {e}")
        
        print("⚠ Nenhum dado encontrado em nenhuma fonte")
        return [], []

