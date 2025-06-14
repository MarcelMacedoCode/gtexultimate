import { useState, useEffect } from 'react';
import GtexDB from '../lib/database.js';

// Hook para gerenciar o banco de dados
export const useDatabase = () => {
  const [db, setDb] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        const database = new GtexDB();
        await database.init();
        setDb(database);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Erro ao inicializar banco:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initDB();
  }, []);

  return { db, isLoading, error };
};

// Hook para gerenciar textos
export const useTexts = (db) => {
  const [texts, setTexts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTexts = async () => {
    if (!db) return;
    
    setIsLoading(true);
    try {
      const allTexts = await db.getAllTexts();
      setTexts(allTexts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    } catch (error) {
      console.error('Erro ao carregar textos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addText = async (textData) => {
    if (!db) return;
    
    try {
      await db.addText(textData);
      await loadTexts();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar texto:', error);
      return false;
    }
  };

  const updateText = async (id, updates) => {
    if (!db) return;
    
    try {
      await db.updateText(id, updates);
      await loadTexts();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar texto:', error);
      return false;
    }
  };

  const deleteText = async (id) => {
    if (!db) return;
    
    try {
      await db.deleteText(id);
      await loadTexts();
      return true;
    } catch (error) {
      console.error('Erro ao deletar texto:', error);
      return false;
    }
  };

  const searchTexts = async (query, filters) => {
    if (!db) return [];
    
    try {
      return await db.searchTexts(query, filters);
    } catch (error) {
      console.error('Erro ao buscar textos:', error);
      return [];
    }
  };

  useEffect(() => {
    loadTexts();
  }, [db]);

  return {
    texts,
    isLoading,
    addText,
    updateText,
    deleteText,
    searchTexts,
    loadTexts
  };
};

// Hook para gerenciar etiquetas
export const useTags = (db) => {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTags = async () => {
    if (!db) return;
    
    setIsLoading(true);
    try {
      const allTags = await db.getAllTags();
      setTags(allTags.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = async (tagData) => {
    if (!db) return;
    
    try {
      await db.addTag(tagData);
      await loadTags();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar etiqueta:', error);
      return false;
    }
  };

  const deleteTag = async (id) => {
    if (!db) return;
    
    try {
      await db.deleteTag(id);
      await loadTags();
      return true;
    } catch (error) {
      console.error('Erro ao deletar etiqueta:', error);
      return false;
    }
  };

  useEffect(() => {
    loadTags();
  }, [db]);

  return {
    tags,
    isLoading,
    addTag,
    deleteTag,
    loadTags
  };
};

// Hook para tema escuro/claro
export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('gtex-theme');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('gtex-theme', JSON.stringify(isDark));
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return { isDark, toggleTheme };
};

// Hook para atalhos de teclado
export const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const alt = event.altKey;
      const shift = event.shiftKey;
      
      let shortcut = '';
      if (ctrl) shortcut += 'ctrl+';
      if (alt) shortcut += 'alt+';
      if (shift) shortcut += 'shift+';
      shortcut += key;
      
      if (shortcuts[shortcut]) {
        event.preventDefault();
        shortcuts[shortcut]();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Hook para estatísticas
export const useStats = (db) => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = async () => {
    if (!db) return;
    
    setIsLoading(true);
    try {
      const statsData = await db.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [db]);

  return { stats, isLoading, loadStats };
};

