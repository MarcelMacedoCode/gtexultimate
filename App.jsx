import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  Moon, 
  Sun, 
  Tag, 
  BarChart3,
  FileText,
  Filter,
  X,
  Save,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import GtexDB from './lib/database.js';
import { exportToJSON, importFromJSON, formatDate, tagColors, validateText, validateTag } from './lib/utils.js';
import './App.css';

function App() {
  // Estados principais
  const [db, setDb] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [texts, setTexts] = useState([]);
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState(null);
  const [isDark, setIsDark] = useState(false);

  // Estados da interface
  const [activeTab, setActiveTab] = useState('texts');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showPreview, setShowPreview] = useState({});

  // Estados dos modais
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingText, setEditingText] = useState(null);

  // Estados dos formulários
  const [textForm, setTextForm] = useState({ title: '', content: '', tags: [] });
  const [tagForm, setTagForm] = useState({ name: '', color: tagColors[0] });
  const [importFile, setImportFile] = useState(null);

  // Inicializar banco de dados
  useEffect(() => {
    const initDB = async () => {
      try {
        const database = new GtexDB();
        await database.init();
        setDb(database);
        await loadData(database);
      } catch (error) {
        console.error('Erro ao inicializar banco:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initDB();
  }, []);

  // Carregar dados
  const loadData = async (database = db) => {
    if (!database) return;
    
    try {
      const [allTexts, allTags, statsData] = await Promise.all([
        database.getAllTexts(),
        database.getAllTags(),
        database.getStats()
      ]);
      
      setTexts(allTexts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
      setTags(allTags.sort((a, b) => a.name.localeCompare(b.name)));
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  // Busca
  useEffect(() => {
    const performSearch = async () => {
      if (!db || (!searchQuery && selectedTags.length === 0)) {
        setSearchResults([]);
        return;
      }
      
      try {
        const results = await db.searchTexts(searchQuery, { tags: selectedTags });
        setSearchResults(results);
      } catch (error) {
        console.error('Erro na busca:', error);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedTags, db]);

  // Tema
  useEffect(() => {
    const saved = localStorage.getItem('gtex-theme');
    if (saved) {
      setIsDark(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gtex-theme', JSON.stringify(isDark));
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Funções de modal
  const openTextModal = (text = null) => {
    setEditingText(text);
    setTextForm(text ? { ...text } : { title: '', content: '', tags: [] });
    setIsTextModalOpen(true);
  };

  const closeAllModals = () => {
    setIsTextModalOpen(false);
    setIsTagModalOpen(false);
    setIsStatsModalOpen(false);
    setIsImportModalOpen(false);
    setEditingText(null);
    setImportFile(null);
  };

  // Funções de texto
  const handleSaveText = async () => {
    const errors = validateText(textForm);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    try {
      if (editingText) {
        await db.updateText(editingText.id, textForm);
      } else {
        await db.addText(textForm);
      }
      await loadData();
      closeAllModals();
    } catch (error) {
      alert('Erro ao salvar texto: ' + error.message);
    }
  };

  const handleDeleteText = async (id) => {
    if (confirm('Tem certeza que deseja excluir este texto?')) {
      try {
        await db.deleteText(id);
        await loadData();
      } catch (error) {
        alert('Erro ao excluir texto: ' + error.message);
      }
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text.content);
    alert('Texto copiado para a área de transferência!');
  };

  // Funções de etiqueta
  const handleSaveTag = async () => {
    const errors = validateTag(tagForm);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    try {
      await db.addTag(tagForm);
      await loadData();
      closeAllModals();
    } catch (error) {
      alert('Erro ao salvar etiqueta: ' + error.message);
    }
  };

  const handleDeleteTag = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta etiqueta?')) {
      try {
        await db.deleteTag(id);
        await loadData();
      } catch (error) {
        alert('Erro ao excluir etiqueta: ' + error.message);
      }
    }
  };

  const toggleTextTag = (tagId) => {
    const currentTags = textForm.tags || [];
    const tagExists = currentTags.some(t => t.id === tagId);
    
    if (tagExists) {
      setTextForm({
        ...textForm,
        tags: currentTags.filter(t => t.id !== tagId)
      });
    } else {
      const tag = tags.find(t => t.id === tagId);
      if (tag) {
        setTextForm({
          ...textForm,
          tags: [...currentTags, tag]
        });
      }
    }
  };

  // Funções de exportação/importação
  const handleExport = async () => {
    if (!db) return;
    
    try {
      const data = await db.exportData();
      exportToJSON(data, 'gtex-ultimate-backup');
      alert('Dados exportados com sucesso!');
    } catch (error) {
      alert('Erro ao exportar dados: ' + error.message);
    }
  };

  const handleImport = async () => {
    if (!importFile || !db) return;
    
    try {
      const data = await importFromJSON(importFile);
      await db.importData(data);
      await loadData();
      closeAllModals();
      alert(`Dados importados com sucesso!\n${data.stats.totalTexts} textos e ${data.stats.totalTags} etiquetas`);
    } catch (error) {
      alert('Erro ao importar dados: ' + error.message);
    }
  };

  // Funções de ordenação e filtro
  const getSortedTexts = () => {
    const textsToSort = searchResults.length > 0 ? searchResults : texts;
    
    return [...textsToSort].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'title') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      } else if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const togglePreview = (textId) => {
    setShowPreview(prev => ({
      ...prev,
      [textId]: !prev[textId]
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Inicializando Gtex Ultimate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-primary">Gtex Ultimate</h1>
              <Badge variant="secondary">IndexedDB</Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStatsModalOpen(true)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Estatísticas
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDark(!isDark)}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="texts" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Textos ({texts.length})</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <span>Etiquetas ({tags.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba de Textos */}
          <TabsContent value="texts" className="space-y-6">
            {/* Barra de busca e filtros */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar textos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updatedAt">Data de modificação</SelectItem>
                      <SelectItem value="createdAt">Data de criação</SelectItem>
                      <SelectItem value="title">Título</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                  
                  <Button onClick={() => openTextModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Texto
                  </Button>
                </div>
              </div>

              {/* Filtro por etiquetas */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground flex items-center">
                    <Filter className="h-4 w-4 mr-1" />
                    Filtrar por etiquetas:
                  </span>
                  {tags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                      className={`cursor-pointer ${selectedTags.includes(tag.id) ? tag.color.value + ' ' + tag.color.text : ''}`}
                      onClick={() => {
                        setSelectedTags(prev => 
                          prev.includes(tag.id) 
                            ? prev.filter(id => id !== tag.id)
                            : [...prev, tag.id]
                        );
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTags([])}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Lista de textos */}
            <div className="grid gap-4">
              {getSortedTexts().length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || selectedTags.length > 0 
                      ? 'Nenhum texto encontrado com os filtros aplicados'
                      : 'Nenhum texto criado ainda'
                    }
                  </p>
                </div>
              ) : (
                getSortedTexts().map(text => (
                  <Card key={text.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{text.title}</CardTitle>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {text.tags?.map(tag => (
                              <Badge
                                key={tag.id}
                                className={`${tag.color.value} ${tag.color.text} text-xs`}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Criado: {formatDate(text.createdAt)} • 
                            Modificado: {formatDate(text.updatedAt)} • 
                            {text.content?.length || 0} caracteres
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePreview(text.id)}
                          >
                            {showPreview[text.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyText(text)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTextModal(text)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteText(text.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {showPreview[text.id] && (
                      <CardContent className="pt-0">
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm whitespace-pre-wrap">
                            {text.content || 'Sem conteúdo'}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Aba de Etiquetas */}
          <TabsContent value="tags" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gerenciar Etiquetas</h2>
              <Button onClick={() => setIsTagModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Etiqueta
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tags.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma etiqueta criada ainda</p>
                </div>
              ) : (
                tags.map(tag => (
                  <Card key={tag.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Badge className={`${tag.color.value} ${tag.color.text}`}>
                          {tag.name}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de Texto */}
      <Dialog open={isTextModalOpen} onOpenChange={setIsTextModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingText ? 'Editar Texto' : 'Novo Texto'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Título</label>
              <Input
                placeholder="Digite o título do texto..."
                value={textForm.title}
                onChange={(e) => setTextForm({ ...textForm, title: e.target.value })}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Conteúdo</label>
              <Textarea
                placeholder="Digite o conteúdo do texto..."
                value={textForm.content}
                onChange={(e) => setTextForm({ ...textForm, content: e.target.value })}
                rows={10}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {textForm.content?.length || 0} caracteres
              </p>
            </div>
            
            {tags.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Etiquetas</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={textForm.tags?.some(t => t.id === tag.id) ? "default" : "outline"}
                      className={`cursor-pointer ${
                        textForm.tags?.some(t => t.id === tag.id) 
                          ? tag.color.value + ' ' + tag.color.text 
                          : ''
                      }`}
                      onClick={() => toggleTextTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={closeAllModals}>
                Cancelar
              </Button>
              <Button onClick={handleSaveText}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Etiqueta */}
      <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Etiqueta</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome</label>
              <Input
                placeholder="Digite o nome da etiqueta..."
                value={tagForm.name}
                onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Cor</label>
              <div className="grid grid-cols-5 gap-2">
                {tagColors.map((color, index) => (
                  <Button
                    key={index}
                    variant={tagForm.color.value === color.value ? "default" : "outline"}
                    className={`h-10 ${color.value} ${color.text}`}
                    onClick={() => setTagForm({ ...tagForm, color })}
                  >
                    {color.name}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={closeAllModals}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTag}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Estatísticas */}
      <Dialog open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estatísticas</DialogTitle>
          </DialogHeader>
          
          {stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.totalTexts}</div>
                  <div className="text-sm text-muted-foreground">Textos</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.totalTags}</div>
                  <div className="text-sm text-muted-foreground">Etiquetas</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.totalCharacters.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Caracteres</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.totalWords.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Palavras</div>
                </div>
              </div>
              
              {stats.averageWordsPerText > 0 && (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{stats.averageWordsPerText}</div>
                  <div className="text-sm text-muted-foreground">Palavras por texto (média)</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Importação */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Dados</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Selecione o arquivo JSON de backup
              </label>
              <Input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files[0])}
              />
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ Esta ação substituirá todos os dados existentes
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={closeAllModals}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImport}
                disabled={!importFile}
                variant="destructive"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingText, setEditingText] = useState(null);
  const [editingTag, setEditingTag] = useState(null);

  // Estados dos formulários
  const [textForm, setTextForm] = useState({ title: '', content: '', tags: [] });
  const [tagForm, setTagForm] = useState({ name: '', color: tagColors[0] });
  const [importFile, setImportFile] = useState(null);

  // Busca com debounce
  const debouncedSearch = debounce(async (query, filters) => {
    if (!query && filters.tags.length === 0) {
      setSearchResults([]);
      return;
    }
    
    const results = await searchTexts(query, { tags: filters.tags });
    setSearchResults(results);
  }, 300);

  useEffect(() => {
    debouncedSearch(searchQuery, { tags: selectedTags });
  }, [searchQuery, selectedTags]);

  // Atalhos de teclado
  useKeyboardShortcuts({
    'ctrl+n': () => openTextModal(),
    'ctrl+e': () => handleExport(),
    'ctrl+i': () => setIsImportModalOpen(true),
    'ctrl+d': () => toggleTheme(),
    'ctrl+f': () => document.getElementById('search-input')?.focus(),
    'esc': () => closeAllModals()
  });

  // Funções de modal
  const openTextModal = (text = null) => {
    setEditingText(text);
    setTextForm(text ? { ...text } : { title: '', content: '', tags: [] });
    setIsTextModalOpen(true);
  };

  const openTagModal = (tag = null) => {
    setEditingTag(tag);
    setTagForm(tag ? { ...tag } : { name: '', color: tagColors[0] });
    setIsTagModalOpen(true);
  };

  const closeAllModals = () => {
    setIsTextModalOpen(false);
    setIsTagModalOpen(false);
    setIsStatsModalOpen(false);
    setIsImportModalOpen(false);
    setEditingText(null);
    setEditingTag(null);
    setImportFile(null);
  };

  // Funções de texto
  const handleSaveText = async () => {
    const errors = validateText(textForm);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    const success = editingText 
      ? await updateText(editingText.id, textForm)
      : await addText(textForm);

    if (success) {
      closeAllModals();
      loadStats();
    }
  };

  const handleDeleteText = async (id) => {
    if (confirm('Tem certeza que deseja excluir este texto?')) {
      await deleteText(id);
      loadStats();
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text.content);
    alert('Texto copiado para a área de transferência!');
  };

  // Funções de etiqueta
  const handleSaveTag = async () => {
    const errors = validateTag(tagForm);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    const success = await addTag(tagForm);
    if (success) {
      closeAllModals();
    }
  };

  const handleDeleteTag = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta etiqueta?')) {
      await deleteTag(id);
    }
  };

  const toggleTextTag = (tagId) => {
    const currentTags = textForm.tags || [];
    const tagExists = currentTags.some(t => t.id === tagId);
    
    if (tagExists) {
      setTextForm({
        ...textForm,
        tags: currentTags.filter(t => t.id !== tagId)
      });
    } else {
      const tag = tags.find(t => t.id === tagId);
      if (tag) {
        setTextForm({
          ...textForm,
          tags: [...currentTags, tag]
        });
      }
    }
  };

  // Funções de exportação/importação
  const handleExport = async () => {
    if (!db) return;
    
    try {
      const data = await db.exportData();
      exportToJSON(data, 'gtex-ultimate-backup');
      alert('Dados exportados com sucesso!');
    } catch (error) {
      alert('Erro ao exportar dados: ' + error.message);
    }
  };

  const handleImport = async () => {
    if (!importFile || !db) return;
    
    try {
      const data = await importFromJSON(importFile);
      await db.importData(data);
      
      // Recarregar dados
      window.location.reload();
      
      alert(`Dados importados com sucesso!\n${data.stats.totalTexts} textos e ${data.stats.totalTags} etiquetas`);
    } catch (error) {
      alert('Erro ao importar dados: ' + error.message);
    }
  };

  // Funções de ordenação e filtro
  const getSortedTexts = () => {
    const textsToSort = searchResults.length > 0 ? searchResults : texts;
    
    return [...textsToSort].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'title') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      } else if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const togglePreview = (textId) => {
    setShowPreview(prev => ({
      ...prev,
      [textId]: !prev[textId]
    }));
  };

  if (dbLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Inicializando Gtex Ultimate...</p>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Erro ao inicializar banco de dados:</p>
          <p className="text-muted-foreground">{dbError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-primary">Gtex Ultimate</h1>
              <Badge variant="secondary">IndexedDB</Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStatsModalOpen(true)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Estatísticas
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="texts" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Textos ({texts.length})</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <span>Etiquetas ({tags.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba de Textos */}
          <TabsContent value="texts" className="space-y-6">
            {/* Barra de busca e filtros */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-input"
                    placeholder="Buscar textos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updatedAt">Data de modificação</SelectItem>
                      <SelectItem value="createdAt">Data de criação</SelectItem>
                      <SelectItem value="title">Título</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                  
                  <Button onClick={() => openTextModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Texto
                  </Button>
                </div>
              </div>

              {/* Filtro por etiquetas */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground flex items-center">
                    <Filter className="h-4 w-4 mr-1" />
                    Filtrar por etiquetas:
                  </span>
                  {tags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                      className={`cursor-pointer ${selectedTags.includes(tag.id) ? tag.color.value + ' ' + tag.color.text : ''}`}
                      onClick={() => {
                        setSelectedTags(prev => 
                          prev.includes(tag.id) 
                            ? prev.filter(id => id !== tag.id)
                            : [...prev, tag.id]
                        );
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTags([])}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Lista de textos */}
            <div className="grid gap-4">
              {textsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando textos...</p>
                </div>
              ) : getSortedTexts().length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || selectedTags.length > 0 
                      ? 'Nenhum texto encontrado com os filtros aplicados'
                      : 'Nenhum texto criado ainda'
                    }
                  </p>
                </div>
              ) : (
                getSortedTexts().map(text => (
                  <Card key={text.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{text.title}</CardTitle>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {text.tags?.map(tag => (
                              <Badge
                                key={tag.id}
                                className={`${tag.color.value} ${tag.color.text} text-xs`}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Criado: {formatDate(text.createdAt)} • 
                            Modificado: {formatDate(text.updatedAt)} • 
                            {text.content?.length || 0} caracteres
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePreview(text.id)}
                          >
                            {showPreview[text.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyText(text)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTextModal(text)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteText(text.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {showPreview[text.id] && (
                      <CardContent className="pt-0">
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm whitespace-pre-wrap">
                            {text.content || 'Sem conteúdo'}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Aba de Etiquetas */}
          <TabsContent value="tags" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gerenciar Etiquetas</h2>
              <Button onClick={() => openTagModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Etiqueta
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tagsLoading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando etiquetas...</p>
                </div>
              ) : tags.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma etiqueta criada ainda</p>
                </div>
              ) : (
                tags.map(tag => (
                  <Card key={tag.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Badge className={`${tag.color.value} ${tag.color.text}`}>
                          {tag.name}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de Texto */}
      <Dialog open={isTextModalOpen} onOpenChange={setIsTextModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingText ? 'Editar Texto' : 'Novo Texto'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Título</label>
              <Input
                placeholder="Digite o título do texto..."
                value={textForm.title}
                onChange={(e) => setTextForm({ ...textForm, title: e.target.value })}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Conteúdo</label>
              <Textarea
                placeholder="Digite o conteúdo do texto..."
                value={textForm.content}
                onChange={(e) => setTextForm({ ...textForm, content: e.target.value })}
                rows={10}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {textForm.content?.length || 0} caracteres
              </p>
            </div>
            
            {tags.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Etiquetas</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={textForm.tags?.some(t => t.id === tag.id) ? "default" : "outline"}
                      className={`cursor-pointer ${
                        textForm.tags?.some(t => t.id === tag.id) 
                          ? tag.color.value + ' ' + tag.color.text 
                          : ''
                      }`}
                      onClick={() => toggleTextTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={closeAllModals}>
                Cancelar
              </Button>
              <Button onClick={handleSaveText}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Etiqueta */}
      <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Etiqueta</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome</label>
              <Input
                placeholder="Digite o nome da etiqueta..."
                value={tagForm.name}
                onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Cor</label>
              <div className="grid grid-cols-5 gap-2">
                {tagColors.map((color, index) => (
                  <Button
                    key={index}
                    variant={tagForm.color.value === color.value ? "default" : "outline"}
                    className={`h-10 ${color.value} ${color.text}`}
                    onClick={() => setTagForm({ ...tagForm, color })}
                  >
                    {color.name}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={closeAllModals}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTag}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Estatísticas */}
      <Dialog open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estatísticas</DialogTitle>
          </DialogHeader>
          
          {stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.totalTexts}</div>
                  <div className="text-sm text-muted-foreground">Textos</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.totalTags}</div>
                  <div className="text-sm text-muted-foreground">Etiquetas</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.totalCharacters.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Caracteres</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.totalWords.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Palavras</div>
                </div>
              </div>
              
              {stats.averageWordsPerText > 0 && (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{stats.averageWordsPerText}</div>
                  <div className="text-sm text-muted-foreground">Palavras por texto (média)</div>
                </div>
              )}
              
              {Object.keys(stats.tagUsage).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Etiquetas mais usadas:</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.tagUsage)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([tagName, count]) => (
                        <div key={tagName} className="flex justify-between items-center">
                          <span className="text-sm">{tagName}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Importação */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Dados</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Selecione o arquivo JSON de backup
              </label>
              <Input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files[0])}
              />
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ Esta ação substituirá todos os dados existentes
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={closeAllModals}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImport}
                disabled={!importFile}
                variant="destructive"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;

