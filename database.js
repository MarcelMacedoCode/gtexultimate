// IndexedDB Manager para Gtex Ultimate
class GtexDB {
  constructor() {
    this.dbName = 'GtexUltimate';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store para textos
        if (!db.objectStoreNames.contains('texts')) {
          const textStore = db.createObjectStore('texts', { keyPath: 'id', autoIncrement: true });
          textStore.createIndex('title', 'title', { unique: false });
          textStore.createIndex('createdAt', 'createdAt', { unique: false });
          textStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        
        // Store para etiquetas
        if (!db.objectStoreNames.contains('tags')) {
          const tagStore = db.createObjectStore('tags', { keyPath: 'id', autoIncrement: true });
          tagStore.createIndex('name', 'name', { unique: true });
          tagStore.createIndex('color', 'color', { unique: false });
        }
        
        // Store para configurações
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Métodos para textos
  async addText(text) {
    const transaction = this.db.transaction(['texts'], 'readwrite');
    const store = transaction.objectStore('texts');
    const textData = {
      ...text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return store.add(textData);
  }

  async updateText(id, updates) {
    const transaction = this.db.transaction(['texts'], 'readwrite');
    const store = transaction.objectStore('texts');
    const text = await this.getText(id);
    const updatedText = {
      ...text,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return store.put(updatedText);
  }

  async getText(id) {
    const transaction = this.db.transaction(['texts'], 'readonly');
    const store = transaction.objectStore('texts');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTexts() {
    const transaction = this.db.transaction(['texts'], 'readonly');
    const store = transaction.objectStore('texts');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteText(id) {
    const transaction = this.db.transaction(['texts'], 'readwrite');
    const store = transaction.objectStore('texts');
    return store.delete(id);
  }

  // Métodos para etiquetas
  async addTag(tag) {
    const transaction = this.db.transaction(['tags'], 'readwrite');
    const store = transaction.objectStore('tags');
    const tagData = {
      ...tag,
      createdAt: new Date().toISOString()
    };
    return store.add(tagData);
  }

  async getAllTags() {
    const transaction = this.db.transaction(['tags'], 'readonly');
    const store = transaction.objectStore('tags');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTag(id) {
    const transaction = this.db.transaction(['tags'], 'readwrite');
    const store = transaction.objectStore('tags');
    return store.delete(id);
  }

  // Métodos para exportação/importação
  async exportData() {
    const texts = await this.getAllTexts();
    const tags = await this.getAllTags();
    
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        texts,
        tags
      },
      stats: {
        totalTexts: texts.length,
        totalTags: tags.length,
        totalCharacters: texts.reduce((sum, text) => sum + (text.content?.length || 0), 0)
      }
    };
  }

  async importData(data) {
    const transaction = this.db.transaction(['texts', 'tags'], 'readwrite');
    const textStore = transaction.objectStore('texts');
    const tagStore = transaction.objectStore('tags');
    
    // Limpar dados existentes
    await textStore.clear();
    await tagStore.clear();
    
    // Importar etiquetas
    if (data.data.tags) {
      for (const tag of data.data.tags) {
        await tagStore.add(tag);
      }
    }
    
    // Importar textos
    if (data.data.texts) {
      for (const text of data.data.texts) {
        await textStore.add(text);
      }
    }
    
    return transaction.complete;
  }

  // Busca avançada
  async searchTexts(query, filters = {}) {
    const texts = await this.getAllTexts();
    
    return texts.filter(text => {
      // Busca por texto
      if (query) {
        const searchText = query.toLowerCase();
        const titleMatch = text.title?.toLowerCase().includes(searchText);
        const contentMatch = text.content?.toLowerCase().includes(searchText);
        if (!titleMatch && !contentMatch) return false;
      }
      
      // Filtro por etiquetas
      if (filters.tags && filters.tags.length > 0) {
        const textTags = text.tags || [];
        const hasMatchingTag = filters.tags.some(tagId => 
          textTags.some(textTag => textTag.id === tagId)
        );
        if (!hasMatchingTag) return false;
      }
      
      // Filtro por data
      if (filters.dateFrom) {
        if (new Date(text.createdAt) < new Date(filters.dateFrom)) return false;
      }
      
      if (filters.dateTo) {
        if (new Date(text.createdAt) > new Date(filters.dateTo)) return false;
      }
      
      return true;
    });
  }

  // Estatísticas
  async getStats() {
    const texts = await this.getAllTexts();
    const tags = await this.getAllTags();
    
    const totalCharacters = texts.reduce((sum, text) => sum + (text.content?.length || 0), 0);
    const totalWords = texts.reduce((sum, text) => {
      const words = text.content?.split(/\s+/).filter(word => word.length > 0) || [];
      return sum + words.length;
    }, 0);
    
    const tagUsage = {};
    texts.forEach(text => {
      (text.tags || []).forEach(tag => {
        tagUsage[tag.name] = (tagUsage[tag.name] || 0) + 1;
      });
    });
    
    return {
      totalTexts: texts.length,
      totalTags: tags.length,
      totalCharacters,
      totalWords,
      averageWordsPerText: texts.length > 0 ? Math.round(totalWords / texts.length) : 0,
      tagUsage,
      lastActivity: texts.length > 0 ? Math.max(...texts.map(t => new Date(t.updatedAt).getTime())) : null
    };
  }
}

export default GtexDB;

