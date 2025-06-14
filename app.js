// Configuração da API
const API_BASE_URL = 'http://localhost:5000/api';

// Estado da aplicação
let texts = [];
let tags = [];
let selectedFilterTagIds = []; // Para filtros na tela principal
let editingTextId = null;
let managingTagsForTextId = null;
let selectedTagIds = []; // Para o modal de gerenciamento de etiquetas
let confirmCallback = null; // Para o modal de confirmação

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// Inicializar aplicação
async function initApp() {
  setupEventListeners();
  await Promise.all([
    loadTexts(),
    loadTags()
  ]);
  renderFilterTags();
}

// Configurar event listeners
function setupEventListeners() {
  // Navegação por abas
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Busca e filtros
  document.getElementById('search-input').addEventListener('input', debounce(handleSearch, 300));
  document.getElementById('filter-toggle-btn').addEventListener('click', toggleFilters);
  document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);

  // Criar texto
  document.getElementById('new-text-content').addEventListener('input', () => {
    updateCharCount('new-text-content', 'char-count');
  });
  document.getElementById('create-text-btn').addEventListener('click', createText);

  // Criar etiqueta
  document.getElementById('new-tag-name').addEventListener('input', updateTagPreview);
  document.getElementById('new-tag-color').addEventListener('input', updateTagPreview);
  document.getElementById('create-tag-btn').addEventListener('click', createTag);

  // Modais
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      closeModal(modalId);
    });
  });

  // Botões de modais
  document.getElementById('update-text-btn').addEventListener('click', updateText);
  document.getElementById('update-text-tags-btn').addEventListener('click', updateTextTags);
  document.getElementById('confirm-action-btn').addEventListener('click', handleConfirmAction);

  // Contador de caracteres para edição
  document.getElementById('edit-text-content').addEventListener('input', () => {
    updateCharCount('edit-text-content', 'edit-text-counter');
  });
}

// Alternar entre abas
function switchTab(tabName) {
  // Atualizar classes das abas
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
  });

  // Atualizar conteúdo visível
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `content-${tabName}`);
  });

  // Carregar dados específicos da aba se necessário
  if (tabName === 'tags') {
    renderTagsList();
  } else if (tabName === 'texts') {
    renderTexts();
  }
}

// Alternar filtros
function toggleFilters() {
  const filterContainer = document.getElementById('filter-container');
  filterContainer.style.display = filterContainer.style.display === 'none' ? 'block' : 'none';
}

// Carregar textos da API
async function loadTexts() {
  try {
    showElementLoading('texts-loading');
    const response = await fetch(`${API_BASE_URL}/texts`);
    if (!response.ok) throw new Error('Erro ao carregar textos');
    texts = await response.json();
    renderTexts();
  } catch (error) {
    console.error('Erro ao carregar textos:', error);
    showNotification('Erro ao carregar textos. Tente novamente mais tarde.', 'error');
  } finally {
    hideElementLoading('texts-loading');
  }
}

// Carregar etiquetas da API
async function loadTags() {
  try {
    showElementLoading('tags-loading');
    showElementLoading('filter-tags-loading');
    const response = await fetch(`${API_BASE_URL}/tags`);
    if (!response.ok) throw new Error('Erro ao carregar etiquetas');
    tags = await response.json();
    renderTagsList();
    renderFilterTags();
  } catch (error) {
    console.error('Erro ao carregar etiquetas:', error);
    showNotification('Erro ao carregar etiquetas. Tente novamente mais tarde.', 'error');
  } finally {
    hideElementLoading('tags-loading');
    hideElementLoading('filter-tags-loading');
  }
}

// Buscar textos
async function handleSearch() {
  const searchTerm = document.getElementById('search-input').value.trim();
  
  try {
    showElementLoading('texts-loading');
    
    // Construir URL de busca
    let url = `${API_BASE_URL}/search`;
    const params = new URLSearchParams();
    
    if (searchTerm) {
      params.append('q', searchTerm);
    }
    
    selectedFilterTagIds.forEach(tagId => {
      params.append('tag_id', tagId);
    });
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro ao buscar textos');
    texts = await response.json();
    renderTexts();
  } catch (error) {
    console.error('Erro ao buscar textos:', error);
    showNotification('Erro ao buscar textos. Tente novamente mais tarde.', 'error');
  } finally {
    hideElementLoading('texts-loading');
  }
}

// Renderizar textos
function renderTexts() {
  const textsContainer = document.getElementById('texts-container');
  
  // Limpar conteúdo anterior, exceto o spinner de carregamento
  const loadingSpinner = document.getElementById('texts-loading');
  textsContainer.innerHTML = '';
  textsContainer.appendChild(loadingSpinner);
  
  if (texts.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'Nenhum texto encontrado. Crie seu primeiro texto acima!';
    textsContainer.appendChild(emptyMessage);
    return;
  }
  
  texts.forEach(text => {
    const card = document.createElement('div');
    card.className = 'text-card';
    
    // Formatar data
    const createdDate = new Date(text.created_at).toLocaleDateString('pt-BR');
    
    // Verificar se o conteúdo é longo
    const isContentLong = text.content.length > 150;
    
    // Criar HTML para etiquetas
    let tagsHTML = '';
    if (text.tags && text.tags.length > 0) {
      tagsHTML = `
        <div class="text-card-tags">
          ${text.tags.map(tag => `
            <span class="text-card-tag" style="background-color: ${tag.color};">${escapeHtml(tag.name)}</span>
          `).join('')}
        </div>
      `;
    }
    
    card.innerHTML = `
      <div class="text-card-header">
        <h3 class="text-card-title">${escapeHtml(text.title)}</h3>
        <div class="text-card-date">Criado em ${createdDate}</div>
      </div>
      <div class="text-card-body">
        <div class="text-card-content" id="content-${text.id}">
          ${escapeHtml(text.content).replace(/\n/g, '<br>')}
        </div>
        ${isContentLong ? `<div class="text-card-fade" onclick="toggleContent(${text.id}, this)">Mais</div>` : ''}
        ${tagsHTML}
      </div>
      <div class="text-card-footer">
        <div class="card-buttons">
          <button class="card-button edit-button" onclick="startEditText(${text.id})">
            <i class="fas fa-edit"></i>
            <span>Editar</span>
          </button>
          <button class="card-button tags-button" onclick="startManageTags(${text.id})">
            <i class="fas fa-tags"></i>
            <span>Etiquetas</span>
          </button>
        </div>
        <div class="card-buttons">
          <button class="icon-button" onclick="copyTextContent(${text.id})" title="Copiar texto">
            <i class="fas fa-copy"></i>
          </button>
          <button class="icon-button" onclick="confirmDeleteText(${text.id})" title="Excluir texto">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    
    textsContainer.appendChild(card);
    
    // Ajustar altura inicial do conteúdo se for longo
    if (isContentLong) {
      const contentDiv = document.getElementById(`content-${text.id}`);
      contentDiv.style.maxHeight = '100px';
    }
  });
}

// Renderizar lista de etiquetas
function renderTagsList() {
  const tagsListContainer = document.getElementById('tags-list-container');
  
  // Limpar conteúdo anterior, exceto o spinner de carregamento
  const loadingSpinner = document.getElementById('tags-loading');
  tagsListContainer.innerHTML = '';
  tagsListContainer.appendChild(loadingSpinner);
  
  if (tags.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'Nenhuma etiqueta criada ainda. Crie sua primeira etiqueta acima!';
    tagsListContainer.appendChild(emptyMessage);
    return;
  }
  
  tags.forEach(tag => {
    const card = document.createElement('div');
    card.className = 'tag-card';
    
    card.innerHTML = `
      <div class="tag-info">
        <span class="tag-badge" style="background-color: ${tag.color};">${escapeHtml(tag.name)}</span>
        <span class="tag-count">${tag.text_count} texto(s)</span>
      </div>
      <button class="icon-button" onclick="confirmDeleteTag(${tag.id})" title="Excluir etiqueta">
        <i class="fas fa-trash"></i>
      </button>
    `;
    
    tagsListContainer.appendChild(card);
  });
}

// Renderizar etiquetas para filtro
function renderFilterTags() {
  const filterTagsContainer = document.getElementById('filter-tags-container');
  
  // Limpar conteúdo anterior, exceto o spinner de carregamento
  const loadingSpinner = document.getElementById('filter-tags-loading');
  filterTagsContainer.innerHTML = '';
  filterTagsContainer.appendChild(loadingSpinner);
  
  if (tags.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.style.color = '#64748b';
    emptyMessage.textContent = 'Nenhuma etiqueta criada ainda.';
    filterTagsContainer.appendChild(emptyMessage);
    return;
  }
  
  tags.forEach(tag => {
    const isSelected = selectedFilterTagIds.includes(tag.id);
    const tagElement = document.createElement('div');
    tagElement.className = `tag ${isSelected ? 'selected' : ''}`;
    tagElement.style.border = `1px solid ${tag.color}`;
    tagElement.style.backgroundColor = isSelected ? tag.color : 'transparent';
    tagElement.style.color = isSelected ? 'white' : '#333';
    tagElement.textContent = tag.name;
    tagElement.onclick = () => toggleTagFilter(tag.id);
    filterTagsContainer.appendChild(tagElement);
  });
}

// Alternar filtro de etiqueta
function toggleTagFilter(tagId) {
  const index = selectedFilterTagIds.indexOf(tagId);
  if (index === -1) {
    selectedFilterTagIds.push(tagId);
  } else {
    selectedFilterTagIds.splice(index, 1);
  }
  renderFilterTags();
  handleSearch();
}

// Limpar filtros
function clearFilters() {
  selectedFilterTagIds = [];
  document.getElementById('search-input').value = '';
  renderFilterTags();
  handleSearch();
}

// Alternar expansão do texto
function toggleContent(textId, buttonElement) {
  const contentDiv = document.getElementById(`content-${textId}`);
  const isExpanded = contentDiv.classList.toggle('expanded');
  contentDiv.style.maxHeight = isExpanded ? 'none' : '100px';
  buttonElement.textContent = isExpanded ? 'Menos' : 'Mais';
}

// Atualizar contador de caracteres
function updateCharCount(textareaId, counterId) {
  const content = document.getElementById(textareaId).value;
  document.getElementById(counterId).textContent = content.length;
}

// Atualizar preview da etiqueta
function updateTagPreview() {
  const name = document.getElementById('new-tag-name').value || 'Preview';
  const color = document.getElementById('new-tag-color').value;
  const tagPreview = document.getElementById('tag-preview');
  tagPreview.textContent = name;
  tagPreview.style.backgroundColor = color;
}

// Criar novo texto
async function createText() {
  const title = document.getElementById('new-text-title').value.trim();
  const content = document.getElementById('new-text-content').value.trim();
  
  if (!title || !content) {
    showNotification('Por favor, preencha o título e o conteúdo do texto.', 'error');
    return;
  }
  
  try {
    showLoader();
    
    const response = await fetch(`${API_BASE_URL}/texts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, content })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao criar texto');
    }
    
    // Limpar formulário
    document.getElementById('new-text-title').value = '';
    document.getElementById('new-text-content').value = '';
    updateCharCount('new-text-content', 'char-count');
    
    // Recarregar textos
    await loadTexts();
    
    showNotification('Texto criado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao criar texto:', error);
    showNotification(error.message || 'Erro ao criar texto. Tente novamente mais tarde.', 'error');
  } finally {
    hideLoader();
  }
}

// Iniciar edição de texto
function startEditText(textId) {
  const text = texts.find(t => t.id === textId);
  if (!text) return;
  
  editingTextId = text.id;
  document.getElementById('edit-text-title').value = text.title;
  document.getElementById('edit-text-content').value = text.content;
  updateCharCount('edit-text-content', 'edit-text-counter');
  openModal('edit-modal');
}

// Atualizar texto
async function updateText() {
  if (!editingTextId) return;
  
  const title = document.getElementById('edit-text-title').value.trim();
  const content = document.getElementById('edit-text-content').value.trim();
  
  if (!title || !content) {
    showNotification('Por favor, preencha o título e o conteúdo do texto.', 'error');
    return;
  }
  
  try {
    showLoader();
    
    const response = await fetch(`${API_BASE_URL}/texts/${editingTextId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, content })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao atualizar texto');
    }
    
    // Recarregar textos
    await loadTexts();
    
    closeModal('edit-modal');
    showNotification('Texto atualizado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao atualizar texto:', error);
    showNotification(error.message || 'Erro ao atualizar texto. Tente novamente mais tarde.', 'error');
  } finally {
    hideLoader();
    editingTextId = null;
  }
}

// Iniciar gerenciamento de etiquetas para um texto
function startManageTags(textId) {
  const text = texts.find(t => t.id === textId);
  if (!text) return;
  
  managingTagsForTextId = text.id;
  document.getElementById('text-tags-title').textContent = `Gerenciar etiquetas para: ${text.title}`;
  
  // Inicializar array de etiquetas selecionadas
  selectedTagIds = text.tags ? text.tags.map(tag => tag.id) : [];
  
  renderAvailableTagsModal();
  renderSelectedTagsModal();
  openModal('tags-modal');
}

// Renderizar etiquetas disponíveis no modal
function renderAvailableTagsModal() {
  const container = document.getElementById('available-tags');
  
  // Limpar conteúdo anterior, exceto o spinner de carregamento
  const loadingSpinner = document.getElementById('available-tags-loading');
  container.innerHTML = '';
  container.appendChild(loadingSpinner);
  
  if (tags.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.style.color = '#64748b';
    emptyMessage.textContent = 'Nenhuma etiqueta criada. Crie na aba \'Etiquetas\'.';
    container.appendChild(emptyMessage);
    return;
  }
  
  tags.forEach(tag => {
    const isSelected = selectedTagIds.includes(tag.id);
    const tagElement = document.createElement('div');
    tagElement.className = `modal-tag ${isSelected ? 'selected' : ''}`;
    tagElement.style.border = `1px solid ${tag.color}`;
    tagElement.style.backgroundColor = isSelected ? tag.color : 'transparent';
    tagElement.style.color = isSelected ? 'white' : '#333';
    tagElement.textContent = tag.name;
    tagElement.onclick = () => toggleTagForText(tag.id);
    container.appendChild(tagElement);
  });
}

// Renderizar etiquetas selecionadas no modal
function renderSelectedTagsModal() {
  const container = document.getElementById('selected-tags');
  container.innerHTML = '';
  
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));
  
  if (selectedTags.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.style.color = '#64748b';
    emptyMessage.textContent = 'Nenhuma etiqueta selecionada.';
    container.appendChild(emptyMessage);
    return;
  }
  
  selectedTags.forEach(tag => {
    const tagElement = document.createElement('div');
    tagElement.className = 'selected-tag';
    tagElement.style.backgroundColor = tag.color;
    tagElement.innerHTML = `${escapeHtml(tag.name)} <span class="selected-tag-remove" onclick="toggleTagForText(${tag.id})">×</span>`;
    container.appendChild(tagElement);
  });
}

// Alternar seleção de etiqueta no modal
function toggleTagForText(tagId) {
  const index = selectedTagIds.indexOf(tagId);
  
  if (index === -1) {
    selectedTagIds.push(tagId);
  } else {
    selectedTagIds.splice(index, 1);
  }
  
  renderAvailableTagsModal();
  renderSelectedTagsModal();
}

// Atualizar etiquetas do texto
async function updateTextTags() {
  if (!managingTagsForTextId) return;
  
  try {
    showLoader();
    
    const response = await fetch(`${API_BASE_URL}/texts/${managingTagsForTextId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tag_ids: selectedTagIds })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao atualizar etiquetas');
    }
    
    // Recarregar textos
    await loadTexts();
    
    closeModal('tags-modal');
    showNotification('Etiquetas atualizadas com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao atualizar etiquetas:', error);
    showNotification(error.message || 'Erro ao atualizar etiquetas. Tente novamente mais tarde.', 'error');
  } finally {
    hideLoader();
    managingTagsForTextId = null;
    selectedTagIds = [];
  }
}

// Criar nova etiqueta
async function createTag() {
  const name = document.getElementById('new-tag-name').value.trim();
  const color = document.getElementById('new-tag-color').value;
  
  if (!name) {
    showNotification('Por favor, preencha o nome da etiqueta.', 'error');
    return;
  }
  
  try {
    showLoader();
    
    const response = await fetch(`${API_BASE_URL}/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, color })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao criar etiqueta');
    }
    
    // Limpar formulário
    document.getElementById('new-tag-name').value = '';
    document.getElementById('new-tag-color').value = '#3B82F6';
    updateTagPreview();
    
    // Recarregar etiquetas
    await loadTags();
    
    showNotification('Etiqueta criada com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao criar etiqueta:', error);
    showNotification(error.message || 'Erro ao criar etiqueta. Tente novamente mais tarde.', 'error');
  } finally {
    hideLoader();
  }
}

// Confirmar exclusão de texto
function confirmDeleteText(textId) {
  const text = texts.find(t => t.id === textId);
  if (!text) return;
  
  document.getElementById('confirm-message').textContent = `Tem certeza que deseja excluir o texto "${text.title}"?`;
  confirmCallback = () => deleteText(textId);
  openModal('confirm-modal');
}

// Excluir texto
async function deleteText(textId) {
  try {
    showLoader();
    
    const response = await fetch(`${API_BASE_URL}/texts/${textId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao excluir texto');
    }
    
    // Recarregar textos
    await loadTexts();
    
    showNotification('Texto excluído com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao excluir texto:', error);
    showNotification(error.message || 'Erro ao excluir texto. Tente novamente mais tarde.', 'error');
  } finally {
    hideLoader();
  }
}

// Confirmar exclusão de etiqueta
function confirmDeleteTag(tagId) {
  const tag = tags.find(t => t.id === tagId);
  if (!tag) return;
  
  document.getElementById('confirm-message').textContent = `Tem certeza que deseja excluir a etiqueta "${tag.name}"? Esta ação também removerá a etiqueta de todos os textos associados.`;
  confirmCallback = () => deleteTag(tagId);
  openModal('confirm-modal');
}

// Excluir etiqueta
async function deleteTag(tagId) {
  try {
    showLoader();
    
    const response = await fetch(`${API_BASE_URL}/tags/${tagId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao excluir etiqueta');
    }
    
    // Recarregar etiquetas e textos
    await Promise.all([
      loadTags(),
      loadTexts()
    ]);
    
    showNotification('Etiqueta excluída com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao excluir etiqueta:', error);
    showNotification(error.message || 'Erro ao excluir etiqueta. Tente novamente mais tarde.', 'error');
  } finally {
    hideLoader();
  }
}

// Executar ação de confirmação
function handleConfirmAction() {
  if (typeof confirmCallback === 'function') {
    closeModal('confirm-modal');
    confirmCallback();
    confirmCallback = null;
  }
}

// Copiar conteúdo do texto para a área de transferência
function copyTextContent(textId) {
  const text = texts.find(t => t.id === textId);
  if (!text) return;
  
  navigator.clipboard.writeText(text.content)
    .then(() => {
      showNotification('Texto copiado para a área de transferência!', 'success');
    })
    .catch(err => {
      console.error('Erro ao copiar texto:', err);
      showNotification('Erro ao copiar texto. Seu navegador pode não suportar esta funcionalidade.', 'error');
    });
}

// Abrir modal
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

// Fechar modal
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Mostrar notificação
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  const notificationMessage = document.getElementById('notification-message');
  const icon = document.getElementById('notification-icon');
  
  notification.className = 'notification';
  notification.classList.add(type);
  notificationMessage.textContent = message;
  icon.textContent = type === 'success' ? '✓' : '⚠';
  
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}

// Mostrar loader
function showLoader() {
  document.getElementById('loader').classList.add('active');
}

// Esconder loader
function hideLoader() {
  document.getElementById('loader').classList.remove('active');
}

// Mostrar loading spinner em um elemento específico
function showElementLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.style.display = 'block';
}

// Esconder loading spinner em um elemento específico
function hideElementLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.style.display = 'none';
}

// Função de debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Função para escapar HTML e prevenir XSS
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
