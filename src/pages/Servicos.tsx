import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { LogOut, Wrench, Plus, Search, Pencil, Trash2, Clock, DollarSign, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacyMode } from '@/contexts/PrivacyModeContext';
import { useNavigate } from 'react-router-dom';
import { useServices, Service, ServiceFormData } from '@/hooks/useServices';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
const Servicos = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { services, isLoading, createService, updateService, deleteService, isCreating, isUpdating } = useServices();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    default_price: 0,
    duration_minutes: 60,
    estimated_cost: 0,
    is_active: true,
  });
  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openNewServiceModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      default_price: 0,
      duration_minutes: 60,
      estimated_cost: 0,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditServiceModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      default_price: service.default_price,
      duration_minutes: service.duration_minutes,
      estimated_cost: service.estimated_cost || 0,
      is_active: service.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingService) {
        await updateService(editingService.id, formData);
      } else {
        await createService(formData);
      }
      setIsModalOpen(false);
      setEditingService(null);
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  const handleDelete = async () => {
    if (deleteServiceId) {
      await deleteService(deleteServiceId);
      setDeleteServiceId(null);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}min`;
  };

  const { maskCurrency } = usePrivacyMode();
  const formatCurrency = (value: number) => maskCurrency(value);

  const calculateProfit = (price: number, cost: number) => {
    if (price <= 0) return 0;
    return ((price - cost) / price) * 100;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3">
            <Wrench className="w-7 h-7 text-primary" />
            Serviços
          </h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie os serviços da sua estética automotiva.
          </p>
        </motion.div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={openNewServiceModal} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Serviço
          </Button>
        </div>

        {/* Services List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredServices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {searchQuery ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Tente buscar por outro termo.'
                : 'Comece cadastrando os serviços que você oferece.'}
            </p>
            {!searchQuery && (
              <Button onClick={openNewServiceModal} className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar serviço
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service, index) => {
              const profit = calculateProfit(service.default_price, service.estimated_cost || 0);
              
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-card border rounded-xl p-4 transition-colors ${
                    service.is_active 
                      ? 'border-border hover:border-primary/30' 
                      : 'border-border/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        service.is_active ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        <Wrench className={`w-5 h-5 ${service.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {service.name}
                          {!service.is_active && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">Inativo</span>
                          )}
                        </h3>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(service.default_price)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditServiceModal(service)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteServiceId(service.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {service.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {formatDuration(service.duration_minutes)}
                    </div>
                    {service.estimated_cost !== null && service.estimated_cost > 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Package className="w-4 h-4" />
                        Custo: {formatCurrency(service.estimated_cost)}
                      </div>
                    )}
                    {profit > 0 && (
                      <div className={`flex items-center gap-1.5 ${profit >= 50 ? 'text-green-500' : profit >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                        <DollarSign className="w-4 h-4" />
                        Margem: {profit.toFixed(0)}%
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      {/* Service Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do serviço *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Polimento Técnico"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o serviço..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="price">Preço padrão (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.default_price || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, default_price: Number(e.target.value) }))
                  }
                  placeholder="0,00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration">Tempo médio (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))
                  }
                  placeholder="60"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cost">Custo estimado (R$)</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.estimated_cost || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, estimated_cost: Number(e.target.value) }))
                }
                placeholder="Produtos, materiais, comissão..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Inclua custos de produtos, materiais e comissões.
              </p>
            </div>

            {editingService && (
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="active">Serviço ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Serviços inativos não aparecem nos agendamentos.
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating || !formData.name || formData.default_price <= 0}
                className="flex-1"
              >
                {(isCreating || isUpdating) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingService ? 'Salvar' : 'Criar Serviço'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O serviço será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Servicos;
