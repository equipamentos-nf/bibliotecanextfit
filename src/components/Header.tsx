import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Settings, Heart, BookOpen, Home } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const { user, profile, isAdmin, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFavorites();
      
      const handleFavoritesUpdated = () => {
        fetchFavorites();
      };
      
      window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
      
      return () => {
        window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
      };
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    setIsLoadingFavorites(true);
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          book_id,
          created_at,
          books:book_id (
            id,
            title,
            author,
            cover_url,
            category,
            status
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error("Erro ao buscar favoritos:", error);
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const removeFavorite = async (favoriteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;
      
      setFavorites(favorites.filter(fav => fav.id !== favoriteId));
      window.dispatchEvent(new CustomEvent('favoritesUpdated'));
    } catch (error) {
      console.error("Erro ao remover favorito:", error);
    }
  };

  const goToBook = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/livro/${bookId}`);
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo com imagem + texto na cor roxa */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img 
            src="/nextlogobotao.jpg" 
            alt="Logo NextFit" 
            className="h-8 w-auto transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-[#8B1DA2] font-bold text-lg md:text-xl tracking-tight group-hover:text-[#6B147D] transition-colors">
            Biblioteca NextFit
          </span>
        </Link>

        {/* Menu de navegação CENTRALIZADO */}
        <nav className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#8B1DA2] transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="font-poppins">Home</span>
          </Link>
          
          <Link
            to="/catalogo"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#8B1DA2] transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span className="font-poppins">Catálogo</span>
          </Link>
          
          {/* Favoritos - dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#8B1DA2] transition-colors relative">
                  <Heart className={`h-4 w-4 ${favorites.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                  <span className="font-poppins">Favoritos</span>
                  {favorites.length > 0 && (
                    <Badge className="absolute -top-2 -right-3 h-5 w-5 p-0 flex items-center justify-center text-xs bg-[#8B1DA2] shadow-sm">
                      {favorites.length}
                    </Badge>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="center" sideOffset={5}>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Heart className="h-4 w-4 text-[#8B1DA2] fill-[#8B1DA2]" />
                      Meus Favoritos
                    </h3>
                    <Badge variant="outline" className="text-xs font-normal">
                      {favorites.length} {favorites.length === 1 ? 'item' : 'itens'}
                    </Badge>
                  </div>
                  
                  {isLoadingFavorites ? (
                    <div className="py-6 text-center">
                      <div className="animate-spin h-6 w-6 border-2 border-[#8B1DA2] border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-xs text-muted-foreground">Carregando favoritos...</p>
                    </div>
                  ) : favorites.length === 0 ? (
                    <div className="py-6 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-[#8B1DA2]/10 rounded-full mb-3">
                        <Heart className="h-6 w-6 text-[#8B1DA2]/60" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">Nenhum livro favoritado</p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/catalogo')}
                      >
                        <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                        Explorar Catálogo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {favorites.slice(0, 5).map((favorite) => (
                        <div 
                          key={favorite.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#EAD6F0] transition-colors group cursor-pointer"
                          onClick={(e) => goToBook(favorite.book_id, e)}
                        >
                          <div className="flex-shrink-0 w-8 h-8 bg-[#EAD6F0] rounded-md flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-[#8B1DA2]" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {favorite.books?.title || "Livro sem título"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {favorite.books?.author || "Autor desconhecido"}
                            </p>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => removeFavorite(favorite.id, e)}
                          >
                            <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      
                      {favorites.length > 5 && (
                        <div className="pt-2 text-center">
                          <p className="text-xs text-muted-foreground">
                            +{favorites.length - 5} mais favoritos
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {favorites.length > 0 && (
                    <div className="border-t mt-3 pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center text-xs"
                        onClick={() => navigate('/favoritos')}
                      >
                        Ver todos os favoritos
                      </Button>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Admin */}
          {user && isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#8B1DA2] transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span className="font-poppins">Admin</span>
            </Link>
          )}
        </nav>

        {/* Perfil do usuário à direita */}
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="h-9 w-20 bg-muted animate-pulse rounded-lg" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 overflow-hidden hover:bg-[#EAD6F0]">
                  <Avatar className="h-9 w-9 border-2 border-[#8B1DA2]/20">
                    <AvatarFallback className="bg-gradient-to-br from-[#8B1DA2] to-[#6B147D] text-white font-semibold">
                      {getInitials(profile?.full_name || user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center gap-3 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-[#8B1DA2] text-white">
                      {getInitials(profile?.full_name || user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5 leading-none overflow-hidden">
                    <p className="font-medium truncate">{profile?.full_name || "Usuário"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                    {isAdmin && (
                      <span className="text-xs bg-[#EAD6F0] text-[#8B1DA2] px-2 py-0.5 rounded-full inline-block w-fit mt-1">
                        Administrador
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/meus-emprestimos" className="cursor-pointer flex items-center hover:text-[#8B1DA2]">
                    <User className="mr-2 h-4 w-4" />
                    <span>Meus Empréstimos</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link to="/favoritos" className="cursor-pointer flex items-center justify-between hover:text-[#8B1DA2]">
                    <div className="flex items-center">
                      <Heart className="mr-2 h-4 w-4" />
                      <span>Meus Favoritos</span>
                    </div>
                    {favorites.length > 0 && (
                      <Badge className="ml-2 bg-[#8B1DA2] text-white text-xs">
                        {favorites.length}
                      </Badge>
                    )}
                  </Link>
                </DropdownMenuItem>
                
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer flex items-center hover:text-[#8B1DA2]">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Administração</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive flex items-center"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/entrar" className="text-sm font-medium text-gray-700 hover:text-[#8B1DA2] transition-colors font-poppins">
                Entrar
              </Link>
              <Link to="/cadastrar">
                <Button size="sm" className="bg-[#8B1DA2] hover:bg-[#6B147D] text-white font-poppins">
                  Cadastrar
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;