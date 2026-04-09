import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  category: string | null;
  isbn: string | null;
  status: "available" | "borrowed" | "pending_approval";
  total_copies: number;
  available_copies: number;
}

const emptyBook = {
  title: "",
  author: "",
  description: "",
  cover_url: "",
  category: "",
  isbn: "",
  total_copies: 1,
  available_copies: 1,
};

const statusConfig = {
  available: { label: "Disponível", className: "bg-success text-success-foreground" },
  borrowed: { label: "Emprestado", className: "bg-muted text-muted-foreground" },
  pending_approval: { label: "Aguardando", className: "bg-warning text-warning-foreground" },
};

const AdminBooks = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState(emptyBook);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("title");

    if (error) {
      toast.error("Erro ao carregar livros");
    } else {
      setBooks(data || []);
    }
    setIsLoading(false);
  };

  const handleOpenDialog = (book?: Book) => {
    if (book) {
      setEditingBook(book);
      setFormData({
        title: book.title,
        author: book.author,
        description: book.description || "",
        cover_url: book.cover_url || "",
        category: book.category || "",
        isbn: book.isbn || "",
        total_copies: book.total_copies,
        available_copies: book.available_copies,
      });
    } else {
      setEditingBook(null);
      setFormData(emptyBook);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const bookData = {
      title: formData.title,
      author: formData.author,
      description: formData.description || null,
      cover_url: formData.cover_url || null,
      category: formData.category || null,
      isbn: formData.isbn || null,
      total_copies: formData.total_copies,
      available_copies: formData.available_copies,
    };

    if (editingBook) {
      const { error } = await supabase
        .from("books")
        .update(bookData)
        .eq("id", editingBook.id);

      if (error) {
        toast.error("Erro ao atualizar livro");
      } else {
        toast.success("Livro atualizado com sucesso");
        setIsDialogOpen(false);
        fetchBooks();
      }
    } else {
      const { error } = await supabase.from("books").insert(bookData);

      if (error) {
        toast.error("Erro ao cadastrar livro");
      } else {
        toast.success("Livro cadastrado com sucesso");
        setIsDialogOpen(false);
        fetchBooks();
      }
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este livro?")) return;

    const { error } = await supabase.from("books").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir livro");
    } else {
      toast.success("Livro excluído com sucesso");
      fetchBooks();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gerenciar Livros</h1>
            <p className="text-muted-foreground">
              Cadastre, edite e remova livros do catálogo
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Livro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingBook ? "Editar Livro" : "Cadastrar Novo Livro"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="author">Autor *</Label>
                    <Input
                      id="author"
                      value={formData.author}
                      onChange={(e) =>
                        setFormData({ ...formData, author: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      placeholder="Ex: Gestão, Tecnologia..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="isbn">ISBN</Label>
                    <Input
                      id="isbn"
                      value={formData.isbn}
                      onChange={(e) =>
                        setFormData({ ...formData, isbn: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cover_url">URL da Capa</Label>
                  <Input
                    id="cover_url"
                    type="url"
                    value={formData.cover_url}
                    onChange={(e) =>
                      setFormData({ ...formData, cover_url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_copies">Total de Cópias</Label>
                    <Input
                      id="total_copies"
                      type="number"
                      min={1}
                      value={formData.total_copies}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          total_copies: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="available_copies">Cópias Disponíveis</Label>
                    <Input
                      id="available_copies"
                      type="number"
                      min={0}
                      max={formData.total_copies}
                      value={formData.available_copies}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          available_copies: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : editingBook ? (
                      "Atualizar"
                    ) : (
                      "Cadastrar"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-xl shadow-soft overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cópias</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {book.author}
                    </TableCell>
                    <TableCell>{book.category || "-"}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[book.status].className}>
                        {statusConfig[book.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {book.available_copies}/{book.total_copies}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(book)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(book.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBooks;
