// Utilitários para exportação e importação de dados

// Função cn para classes CSS (necessária para shadcn/ui)
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

export const exportToJSON = (data, filename = 'gtex-backup') => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export const importFromJSON = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Nenhum arquivo selecionado'));
      return;
    }
    
    if (file.type !== 'application/json') {
      reject(new Error('Arquivo deve ser do tipo JSON'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        // Validar estrutura do arquivo
        if (!data.version || !data.data) {
          reject(new Error('Formato de arquivo inválido'));
          return;
        }
        
        resolve(data);
      } catch (error) {
        reject(new Error('Erro ao processar arquivo JSON: ' + error.message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };
    
    reader.readAsText(file);
  });
};

// Utilitários de formatação
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Cores predefinidas para etiquetas
export const tagColors = [
  { name: 'Azul', value: 'bg-blue-500', text: 'text-white' },
  { name: 'Verde', value: 'bg-green-500', text: 'text-white' },
  { name: 'Vermelho', value: 'bg-red-500', text: 'text-white' },
  { name: 'Amarelo', value: 'bg-yellow-500', text: 'text-black' },
  { name: 'Roxo', value: 'bg-purple-500', text: 'text-white' },
  { name: 'Rosa', value: 'bg-pink-500', text: 'text-white' },
  { name: 'Laranja', value: 'bg-orange-500', text: 'text-white' },
  { name: 'Cinza', value: 'bg-gray-500', text: 'text-white' },
  { name: 'Índigo', value: 'bg-indigo-500', text: 'text-white' },
  { name: 'Teal', value: 'bg-teal-500', text: 'text-white' }
];

// Validação de dados
export const validateText = (text) => {
  const errors = [];
  
  if (!text.title || text.title.trim().length === 0) {
    errors.push('Título é obrigatório');
  }
  
  if (text.title && text.title.length > 200) {
    errors.push('Título deve ter no máximo 200 caracteres');
  }
  
  if (text.content && text.content.length > 100000) {
    errors.push('Conteúdo deve ter no máximo 100.000 caracteres');
  }
  
  return errors;
};

export const validateTag = (tag) => {
  const errors = [];
  
  if (!tag.name || tag.name.trim().length === 0) {
    errors.push('Nome da etiqueta é obrigatório');
  }
  
  if (tag.name && tag.name.length > 50) {
    errors.push('Nome da etiqueta deve ter no máximo 50 caracteres');
  }
  
  if (!tag.color) {
    errors.push('Cor da etiqueta é obrigatória');
  }
  
  return errors;
};

// Atalhos de teclado
export const keyboardShortcuts = {
  'ctrl+n': 'Novo texto',
  'ctrl+s': 'Salvar texto',
  'ctrl+f': 'Buscar',
  'ctrl+e': 'Exportar dados',
  'ctrl+i': 'Importar dados',
  'ctrl+d': 'Alternar tema',
  'esc': 'Fechar modal'
};

// Debounce para busca
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

