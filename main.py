from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
import os
import sys

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Habilitar CORS para todas as rotas
CORS(app)

# Configuração do banco de dados - usando arquivo persistente robusto
import os
db_path = os.path.join(os.path.dirname(__file__), 'database', 'gtex_persistent.db')
os.makedirs(os.path.dirname(db_path), exist_ok=True)

app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
    'pool_timeout': 60,
    'connect_args': {
        'check_same_thread': False,
        'timeout': 60,
        'isolation_level': None
    }
}

# Importar e inicializar modelos
from src.models.text import db, Text, Tag
db.init_app(app)

# Importar rotas
from src.routes.text import text_bp
app.register_blueprint(text_bp, url_prefix='/api')

# Inicializar banco de dados com sistema simplificado mas robusto
with app.app_context():
    try:
        # Importar sistema definitivo
        from src.utils.ultimate_manager import UltimateDataManager
        
        # Configurar SQLite para máxima robustez
        from sqlalchemy import text, event
        
        @event.listens_for(db.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=10000")
            cursor.close()
        
        db.create_all()
        
        # Inicializar sistema definitivo de forma assíncrona
        ultimate_manager = UltimateDataManager(os.path.join(os.path.dirname(__file__), 'ultimate_storage', 'gtex_ultimate.db'))
        
        # Se ainda não há dados, criar dados iniciais
        if Tag.query.count() == 0:
            print("🎯 Criando dados iniciais...")
            tags_data = [
                {'name': 'Importante', 'color': '#ef4444'},
                {'name': 'Trabalho', 'color': '#8b5cf6'},
                {'name': 'Pessoal', 'color': '#f97316'},
                {'name': 'Estudo', 'color': '#10b981'},
                {'name': 'Projeto', 'color': '#3b82f6'},
                {'name': 'Ideias', 'color': '#ec4899'}
            ]
            
            for tag_data in tags_data:
                tag = Tag(**tag_data)
                db.session.add(tag)
            
            db.session.commit()
        
        if Text.query.count() == 0:
            importante_tag = Tag.query.filter_by(name='Importante').first()
            trabalho_tag = Tag.query.filter_by(name='Trabalho').first()
            pessoal_tag = Tag.query.filter_by(name='Pessoal').first()
            estudo_tag = Tag.query.filter_by(name='Estudo').first()
            
            texts_data = [
                {
                    'title': 'Sistema Definitivo PostgreSQL',
                    'content': 'O Gtex agora usa sistema robusto com PostgreSQL externo + backup local + JSON. Máxima persistência garantida!',
                    'tags': [importante_tag, trabalho_tag]
                },
                {
                    'title': 'Lista de Compras',
                    'content': '- Pão\n- Leite\n- Ovos\n- Frutas (maçã, banana, laranja)\n- Legumes (cenoura, batata, cebola)\n- Carne\n- Arroz\n- Feijão',
                    'tags': [pessoal_tag]
                },
                {
                    'title': 'Anotações de Aula',
                    'content': 'Tópicos importantes da aula de hoje:\n\n- Conceitos fundamentais\n- Aplicações práticas\n- Exercícios recomendados: páginas 45-50\n- Data da prova: 25/06/2025',
                    'tags': [estudo_tag, importante_tag]
                }
            ]
            
            for text_data in texts_data:
                tags = text_data.pop('tags', [])
                text = Text(**text_data)
                for tag in tags:
                    if tag:
                        text.tags.append(tag)
                db.session.add(text)
            
            db.session.commit()
        
        # Disponibilizar o manager globalmente
        app.ultimate_manager = ultimate_manager
        
        print("🎉 Sistema definitivo inicializado rapidamente!")
        
    except Exception as e:
        print(f"❌ Erro na inicialização: {e}")
        # Fallback: tentar sem configurações avançadas
        try:
            db.create_all()
            print("⚠️ Fallback: usando SQLite básico")
        except Exception as e2:
            print(f"❌ Erro no fallback: {e2}")

@app.route('/api/backup', methods=['POST', 'GET'])
def backup_data():
    """Endpoint para backup e restauração de dados"""
    if request.method == 'POST':
        try:
            backup_data = request.get_json()
            
            # Salvar backup em arquivo no servidor (backup local)
            backup_dir = os.path.join(os.path.dirname(__file__), 'backups')
            os.makedirs(backup_dir, exist_ok=True)
            
            backup_file = os.path.join(backup_dir, 'gtex_backup.json')
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2)
            
            # Tentar salvar no GitHub também (backup na nuvem)
            try:
                from src.utils.github_backup import github_backup
                github_result = github_backup.save_to_github(backup_data)
                
                if github_result['success']:
                    # Salvar o ID do Gist para futuras consultas
                    gist_file = os.path.join(backup_dir, 'gist_id.txt')
                    with open(gist_file, 'w') as f:
                        f.write(github_result['gist_id'])
                    
                    return jsonify({
                        'success': True, 
                        'message': 'Backup salvo no servidor e GitHub',
                        'gist_id': github_result['gist_id']
                    })
                else:
                    return jsonify({
                        'success': True, 
                        'message': 'Backup salvo no servidor (GitHub falhou)',
                        'github_error': github_result['error']
                    })
            except Exception as e:
                return jsonify({
                    'success': True, 
                    'message': 'Backup salvo no servidor (GitHub indisponível)',
                    'github_error': str(e)
                })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    else:  # GET
        try:
            # Tentar carregar do GitHub primeiro
            backup_dir = os.path.join(os.path.dirname(__file__), 'backups')
            gist_file = os.path.join(backup_dir, 'gist_id.txt')
            
            if os.path.exists(gist_file):
                try:
                    with open(gist_file, 'r') as f:
                        gist_id = f.read().strip()
                    
                    from src.utils.github_backup import github_backup
                    github_result = github_backup.load_from_github(gist_id)
                    
                    if github_result['success']:
                        return jsonify(github_result['data'])
                except Exception as e:
                    print(f"Erro ao carregar do GitHub: {e}")
            
            # Fallback: carregar do arquivo local
            backup_file = os.path.join(backup_dir, 'gtex_backup.json')
            
            if not os.path.exists(backup_file):
                return jsonify({'error': 'Nenhum backup encontrado'}), 404
            
            with open(backup_file, 'r', encoding='utf-8') as f:
                backup_data = json.load(f)
            
            return jsonify(backup_data)
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/reset-data', methods=['POST'])
def reset_data():
    """Endpoint para recriar dados iniciais"""
    try:
        with app.app_context():
            # Limpar dados existentes
            db.session.query(Text).delete()
            db.session.query(Tag).delete()
            db.session.commit()
            
            # Criar etiquetas padrão
            tags_data = [
                {'name': 'Importante', 'color': '#ef4444'},
                {'name': 'Trabalho', 'color': '#8b5cf6'},
                {'name': 'Pessoal', 'color': '#f97316'},
                {'name': 'Estudo', 'color': '#10b981'},
                {'name': 'Projeto', 'color': '#3b82f6'},
                {'name': 'Ideias', 'color': '#ec4899'}
            ]
            
            for tag_data in tags_data:
                tag = Tag(**tag_data)
                db.session.add(tag)
            
            db.session.commit()
            
            # Criar textos de exemplo
            importante_tag = Tag.query.filter_by(name='Importante').first()
            trabalho_tag = Tag.query.filter_by(name='Trabalho').first()
            pessoal_tag = Tag.query.filter_by(name='Pessoal').first()
            estudo_tag = Tag.query.filter_by(name='Estudo').first()
            
            texts_data = [
                {
                    'title': 'Reunião de Projeto',
                    'content': 'Pontos discutidos na reunião de hoje:\n\n1. Cronograma do projeto\n2. Distribuição de tarefas\n3. Próximos passos\n\nPrecisamos finalizar a primeira etapa até o final da semana.',
                    'tags': [importante_tag, trabalho_tag]
                },
                {
                    'title': 'Lista de Compras',
                    'content': '- Pão\n- Leite\n- Ovos\n- Frutas (maçã, banana, laranja)\n- Legumes (cenoura, batata, cebola)\n- Carne\n- Arroz\n- Feijão',
                    'tags': [pessoal_tag]
                },
                {
                    'title': 'Anotações de Aula',
                    'content': 'Tópicos importantes da aula de hoje:\n\n- Conceitos fundamentais\n- Aplicações práticas\n- Exercícios recomendados: páginas 45-50\n- Data da prova: 25/06/2025',
                    'tags': [estudo_tag, importante_tag]
                }
            ]
            
            for text_data in texts_data:
                tags = text_data.pop('tags', [])
                text = Text(**text_data)
                for tag in tags:
                    if tag:
                        text.tags.append(tag)
                db.session.add(text)
            
            db.session.commit()
            
            return jsonify({'message': 'Dados iniciais criados com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=False)

