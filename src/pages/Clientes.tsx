import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { LogOut, Users, Plus, Search, Phone, Car, Calendar, Pencil, Trash2, MessageCircle } from 'lucide-react';
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useClients, Client, ClientFormData } from '@/hooks/useClients';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

const Clientes = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { clients, isLoading, createClient, updateClient, deleteClient } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    phone: '',
    birthdate: '',
    vehicle: '',
    notes: '',
  });
  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      (client.vehicle && client.vehicle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openNewClientModal = () => {
    setEditingClient(null);
    setFormData({ name: '', phone: '', birthdate: '', vehicle: '', notes: '' });
    setIsModalOpen(true);
  };

  const openEditClientModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      birthdate: client.birthdate || '',
      vehicle: client.vehicle || '',
      notes: client.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        await createClient(formData);
      }
      setIsModalOpen(false);
      setEditingClient(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteClientId) {
      await deleteClient(deleteClientId);
      setDeleteClientId(null);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
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
            <Users className="w-7 h-7 text-primary" />
            Clientes
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e histórico de atendimentos.
          </p>
        </motion.div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou veículo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={openNewClientModal} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Clients List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredClients.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Tente buscar por outro termo.'
                : 'Comece adicionando seu primeiro cliente.'}
            </p>
            {!searchQuery && (
              <Button onClick={openNewClientModal} className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar cliente
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{client.name}</h3>
                      <a
                        href={`tel:${client.phone.replace(/\D/g, '')}`}
                        className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary"
                      >
                        <Phone className="w-3 h-3" />
                        {client.phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <WhatsAppButton
                      clientName={client.name}
                      clientPhone={client.phone}
                      clientId={client.id}
                      size="icon"
                      variant="ghost"
                      showLabel={false}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEditClientModal(client)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteClientId(client.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {client.vehicle && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Car className="w-4 h-4" />
                    {client.vehicle}
                  </div>
                )}

                {client.birthdate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(client.birthdate)}
                  </div>
                )}

                {client.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{client.notes}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      {/* Client Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do cliente"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))
                }
                placeholder="(00) 00000-0000"
                required
              />
            </div>

            <div>
              <Label htmlFor="birthdate">Data de nascimento</Label>
              <Input
                id="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={(e) => setFormData((prev) => ({ ...prev, birthdate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="vehicle">Veículo</Label>
              <Input
                id="vehicle"
                value={formData.vehicle}
                onChange={(e) => setFormData((prev) => ({ ...prev, vehicle: e.target.value }))}
                placeholder="Ex: Honda Civic Preto 2022"
              />
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Anotações sobre o cliente..."
                rows={3}
              />
            </div>

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
                disabled={isSubmitting || !formData.name || !formData.phone}
                className="flex-1"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingClient ? 'Salvar' : 'Criar Cliente'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClientId} onOpenChange={() => setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente será removido permanentemente.
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

export default Clientes;
