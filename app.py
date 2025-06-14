import os
import sqlite3
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Habilita CORS para todas as rotas

# Configuração do banco de dados
DATABASE = os.path.abspath('gtex.db')

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        
        # Criar tabela de textos
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS texts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Criar tabela de etiquetas
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL
        )
        ''')
        
        # Criar tabela de relacionamento entre textos e etiquetas
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS text_tags (
            text_id INTEGER,
            tag_id INTEGER,
            PRIMARY KEY (text_id, tag_id),
            FOREIGN KEY (text_id) REFERENCES texts (id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
        )
        ''')
        
        # Inserir dados iniciais se necessário
        cursor.execute("SELECT COUNT(*) FROM tags")
        if cursor.fetchone()[0] == 0:
            # Inserir etiquetas padrão
            cursor.execute("INSERT INTO tags (name, color) VALUES (?, ?)", ("Importante", "#ef4444"))
            cursor.execute("INSERT INTO tags (name, color) VALUES (?, ?)", ("Trabalho", "#8b5cf6"))
            cursor.execute("INSERT INTO tags (name, color) VALUES (?, ?)", ("Pessoal", "#f97316"))
            cursor.execute("INSERT INTO tags (name, color) VALUES (?, ?)", ("Estudo", "#10b981"))
        
        cursor.execute("SELECT COUNT(*) FROM texts")
        if cursor.fetchone()[0] == 0:
            # Inserir textos de exemplo
            cursor.execute(
                "INSERT INTO texts (title, content, created_at) VALUES (?, ?, ?)",
                ("Reunião de Projeto", "Pontos discutidos na reunião de hoje: 1. Cronograma do projeto, 2. Distribuição de tarefas, 3. Próximos passos. Precisamos finalizar a primeira etapa até o final da semana.", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            )
            text_id = cursor.lastrowid
            cursor.execute("INSERT INTO text_tags (text_id, tag_id) VALUES (?, ?)", (text_id, 1))  # Importante
            cursor.execute("INSERT INTO text_tags (text_id, tag_id) VALUES (?, ?)", (text_id, 2))  # Trabalho
            
            cursor.execute(
                "INSERT INTO texts (title, content, created_at) VALUES (?, ?, ?)",
                ("Lista de Compras", "- Pão\n- Leite\n- Ovos\n- Frutas (maçã, banana, laranja)\n- Legumes (cenoura, batata, cebola)\n- Carne\n- Arroz\n- Feijão", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            )
            text_id = cursor.lastrowid
            cursor.execute("INSERT INTO text_tags (text_id, tag_id) VALUES (?, ?)", (text_id, 3))  # Pessoal
            
            cursor.execute(
                "INSERT INTO texts (title, content, created_at) VALUES (?, ?, ?)",
                ("Anotações de Aula", "Tópicos importantes da aula de hoje:\n- Conceitos fundamentais\n- Aplicações práticas\n- Exercícios recomendados: páginas 45-50\n- Data da prova: 25/06/2025", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            )
            text_id = cursor.lastrowid
            cursor.execute("INSERT INTO text_tags (text_id, tag_id) VALUES (?, ?)", (text_id, 4))  # Estudo
            cursor.execute("INSERT INTO text_tags (text_id, tag_id) VALUES (?, ?)", (text_id, 1))  # Importante
        
        db.commit()

# Rotas para textos
@app.route('/api/texts', methods=['GET'])
def get_texts():
    db = get_db()
    cursor = db.cursor()
    
    texts = []
    for row in cursor.execute('SELECT * FROM texts ORDER BY created_at DESC'):
        text = dict(row)
        
        # Buscar etiquetas associadas a este texto
        tags = []
        for tag_row in cursor.execute('''
            SELECT t.id, t.name, t.color
            FROM tags t
            JOIN text_tags tt ON t.id = tt.tag_id
            WHERE tt.text_id = ?
        ''', (text['id'],)):
            tags.append(dict(tag_row))
        
        text['tags'] = tags
        texts.append(text)
    
    return jsonify(texts)

@app.route('/api/texts', methods=['POST'])
def create_text():
    data = request.json
    if not data or 'title' not in data or 'content' not in data:
        return jsonify({'error': 'Título e conteúdo são obrigatórios'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        'INSERT INTO texts (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
        (data['title'], data['content'], now, now)
    )
    text_id = cursor.lastrowid
    
    # Associar etiquetas se fornecidas
    if 'tag_ids' in data and isinstance(data['tag_ids'], list):
        for tag_id in data['tag_ids']:
            cursor.execute('INSERT INTO text_tags (text_id, tag_id) VALUES (?, ?)', (text_id, tag_id))
    
    db.commit()
    
    # Retornar o texto criado com suas etiquetas
    cursor.execute('SELECT * FROM texts WHERE id = ?', (text_id,))
    text = dict(cursor.fetchone())
    
    # Buscar etiquetas associadas
    tags = []
    for tag_row in cursor.execute('''
        SELECT t.id, t.name, t.color
        FROM tags t
        JOIN text_tags tt ON t.id = tt.tag_id
        WHERE tt.text_id = ?
    ''', (text_id,)):
        tags.append(dict(tag_row))
    
    text['tags'] = tags
    
    return jsonify(text), 201

@app.route('/api/texts/<int:text_id>', methods=['GET'])
def get_text(text_id):
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('SELECT * FROM texts WHERE id = ?', (text_id,))
    row = cursor.fetchone()
    
    if row is None:
        return jsonify({'error': 'Texto não encontrado'}), 404
    
    text = dict(row)
    
    # Buscar etiquetas associadas
    tags = []
    for tag_row in cursor.execute('''
        SELECT t.id, t.name, t.color
        FROM tags t
        JOIN text_tags tt ON t.id = tt.tag_id
        WHERE tt.text_id = ?
    ''', (text_id,)):
        tags.append(dict(tag_row))
    
    text['tags'] = tags
    
    return jsonify(text)

@app.route('/api/texts/<int:text_id>', methods=['PUT'])
def update_text(text_id):
    data = request.json
    if not data:
        return jsonify({'error': 'Dados inválidos'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    # Verificar se o texto existe
    cursor.execute('SELECT id FROM texts WHERE id = ?', (text_id,))
    if cursor.fetchone() is None:
        return jsonify({'error': 'Texto não encontrado'}), 404
    
    # Atualizar texto
    updates = []
    params = []
    
    if 'title' in data:
        updates.append('title = ?')
        params.append(data['title'])
    
    if 'content' in data:
        updates.append('content = ?')
        params.append(data['content'])
    
    updates.append('updated_at = ?')
    params.append(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    params.append(text_id)
    
    cursor.execute(
        f'UPDATE texts SET {", ".join(updates)} WHERE id = ?',
        tuple(params)
    )
    
    # Atualizar etiquetas se fornecidas
    if 'tag_ids' in data and isinstance(data['tag_ids'], list):
        # Remover associações existentes
        cursor.execute('DELETE FROM text_tags WHERE text_id = ?', (text_id,))
        
        # Adicionar novas associações
        for tag_id in data['tag_ids']:
            cursor.execute('INSERT INTO text_tags (text_id, tag_id) VALUES (?, ?)', (text_id, tag_id))
    
    db.commit()
    
    # Retornar o texto atualizado
    cursor.execute('SELECT * FROM texts WHERE id = ?', (text_id,))
    text = dict(cursor.fetchone())
    
    # Buscar etiquetas associadas
    tags = []
    for tag_row in cursor.execute('''
        SELECT t.id, t.name, t.color
        FROM tags t
        JOIN text_tags tt ON t.id = tt.tag_id
        WHERE tt.text_id = ?
    ''', (text_id,)):
        tags.append(dict(tag_row))
    
    text['tags'] = tags
    
    return jsonify(text)

@app.route('/api/texts/<int:text_id>', methods=['DELETE'])
def delete_text(text_id):
    db = get_db()
    cursor = db.cursor()
    
    # Verificar se o texto existe
    cursor.execute('SELECT id FROM texts WHERE id = ?', (text_id,))
    if cursor.fetchone() is None:
        return jsonify({'error': 'Texto não encontrado'}), 404
    
    # Excluir o texto (as associações com etiquetas serão excluídas automaticamente devido à restrição ON DELETE CASCADE)
    cursor.execute('DELETE FROM texts WHERE id = ?', (text_id,))
    db.commit()
    
    return jsonify({'message': 'Texto excluído com sucesso'})

# Rotas para etiquetas
@app.route('/api/tags', methods=['GET'])
def get_tags():
    db = get_db()
    cursor = db.cursor()
    
    tags = []
    for row in cursor.execute('SELECT * FROM tags ORDER BY name'):
        tag = dict(row)
        
        # Contar quantos textos usam esta etiqueta
        cursor.execute('SELECT COUNT(*) FROM text_tags WHERE tag_id = ?', (tag['id'],))
        tag['text_count'] = cursor.fetchone()[0]
        
        tags.append(tag)
    
    return jsonify(tags)

@app.route('/api/tags', methods=['POST'])
def create_tag():
    data = request.json
    if not data or 'name' not in data or 'color' not in data:
        return jsonify({'error': 'Nome e cor são obrigatórios'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute(
            'INSERT INTO tags (name, color) VALUES (?, ?)',
            (data['name'], data['color'])
        )
        tag_id = cursor.lastrowid
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Uma etiqueta com este nome já existe'}), 400
    
    # Retornar a etiqueta criada
    cursor.execute('SELECT * FROM tags WHERE id = ?', (tag_id,))
    tag = dict(cursor.fetchone())
    tag['text_count'] = 0  # Nova etiqueta, ainda não associada a textos
    
    return jsonify(tag), 201

@app.route('/api/tags/<int:tag_id>', methods=['PUT'])
def update_tag(tag_id):
    data = request.json
    if not data:
        return jsonify({'error': 'Dados inválidos'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    # Verificar se a etiqueta existe
    cursor.execute('SELECT id FROM tags WHERE id = ?', (tag_id,))
    if cursor.fetchone() is None:
        return jsonify({'error': 'Etiqueta não encontrada'}), 404
    
    # Atualizar etiqueta
    updates = []
    params = []
    
    if 'name' in data:
        updates.append('name = ?')
        params.append(data['name'])
    
    if 'color' in data:
        updates.append('color = ?')
        params.append(data['color'])
    
    params.append(tag_id)
    
    try:
        cursor.execute(
            f'UPDATE tags SET {", ".join(updates)} WHERE id = ?',
            tuple(params)
        )
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Uma etiqueta com este nome já existe'}), 400
    
    # Retornar a etiqueta atualizada
    cursor.execute('SELECT * FROM tags WHERE id = ?', (tag_id,))
    tag = dict(cursor.fetchone())
    
    # Contar quantos textos usam esta etiqueta
    cursor.execute('SELECT COUNT(*) FROM text_tags WHERE tag_id = ?', (tag_id,))
    tag['text_count'] = cursor.fetchone()[0]
    
    return jsonify(tag)

@app.route('/api/tags/<int:tag_id>', methods=['DELETE'])
def delete_tag(tag_id):
    db = get_db()
    cursor = db.cursor()
    
    # Verificar se a etiqueta existe
    cursor.execute('SELECT id FROM tags WHERE id = ?', (tag_id,))
    if cursor.fetchone() is None:
        return jsonify({'error': 'Etiqueta não encontrada'}), 404
    
    # Excluir a etiqueta (as associações com textos serão excluídas automaticamente devido à restrição ON DELETE CASCADE)
    cursor.execute('DELETE FROM tags WHERE id = ?', (tag_id,))
    db.commit()
    
    return jsonify({'message': 'Etiqueta excluída com sucesso'})

# Rota para busca de textos
@app.route('/api/search', methods=['GET'])
def search_texts():
    query = request.args.get('q', '')
    tag_ids = request.args.getlist('tag_id')
    
    db = get_db()
    cursor = db.cursor()
    
    # Construir a consulta SQL
    sql = 'SELECT DISTINCT t.* FROM texts t'
    params = []
    
    # Adicionar junção com etiquetas se necessário
    if tag_ids:
        sql += ' JOIN text_tags tt ON t.id = tt.text_id'
        sql += ' WHERE tt.tag_id IN (' + ','.join(['?'] * len(tag_ids)) + ')'
        params.extend(tag_ids)
    
    # Adicionar condição de busca por texto
    if query:
        if tag_ids:
            sql += ' AND'
        else:
            sql += ' WHERE'
        sql += ' (t.title LIKE ? OR t.content LIKE ?)'
        params.extend(['%' + query + '%', '%' + query + '%'])
    
    sql += ' ORDER BY t.created_at DESC'
    
    texts = []
    for row in cursor.execute(sql, params):
        text = dict(row)
        
        # Buscar etiquetas associadas a este texto
        tags = []
        for tag_row in cursor.execute('''
            SELECT t.id, t.name, t.color
            FROM tags t
            JOIN text_tags tt ON t.id = tt.tag_id
            WHERE tt.text_id = ?
        ''', (text['id'],)):
            tags.append(dict(tag_row))
        
        text['tags'] = tags
        texts.append(text)
    
    return jsonify(texts)

if __name__ == '__main__':
    # Inicializar o banco de dados
    init_db()
    
    # Iniciar o servidor
    app.run(host='0.0.0.0', port=5000, debug=True)
