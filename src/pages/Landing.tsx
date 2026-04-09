import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Clock, CheckCircle, ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Header from "@/components/Header";

const Landing = () => {
  // Lista atualizada com as imagens fornecidas
  const backgroundImages = [
    '/NEXT FUT.JPG',
    '/comercial.JPG',
    '/cs.JPG',
    '/engenharia.JPG',
    '/growth.JPG',
    '/rapazes.JPG',
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);

  // Pré-carregar imagens
  useEffect(() => {
    const loadImage = (src: string) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(src);
        img.onerror = reject;
      });
    };

    const loadAllImages = async () => {
      const loaded: string[] = [];
      for (const imgSrc of backgroundImages) {
        try {
          await loadImage(imgSrc);
          loaded.push(imgSrc);
        } catch (error) {
          console.warn(`Failed to load image: ${imgSrc}`);
        }
      }
      setLoadedImages(loaded);
    };

    loadAllImages();
  }, []);

  // Navegação com useCallback para evitar recriações
  const goToNextImage = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === backgroundImages.length - 1 ? 0 : prevIndex + 1
      );
      setIsTransitioning(false);
    }, 500);
  }, [backgroundImages.length]);

  const goToPrevImage = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? backgroundImages.length - 1 : prevIndex - 1
      );
      setIsTransitioning(false);
    }, 500);
  }, [backgroundImages.length]);

  const goToImage = useCallback((index: number) => {
    if (index === currentImageIndex) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex(index);
      setIsTransitioning(false);
    }, 500);
  }, [currentImageIndex]);

  // Slideshow automático
  useEffect(() => {
    if (!isAutoPlaying || loadedImages.length === 0) return;

    const interval = setInterval(goToNextImage, 7000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, goToNextImage, loadedImages.length]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevImage();
      if (e.key === 'ArrowRight') goToNextImage();
      if (e.key === ' ') {
        e.preventDefault();
        setIsAutoPlaying(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevImage, goToNextImage]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header importado */}
      <Header />

      {/* Hero Section - Overlay mais escuro */}
      <section className="relative h-[70vh] md:h-[80vh] overflow-hidden">
        {/* Contêiner do slideshow */}
        <div className="absolute inset-0">
          {/* Imagens pré-carregadas */}
          {loadedImages.map((imgSrc, index) => (
            <div
              key={imgSrc}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentImageIndex 
                  ? 'opacity-100 z-0' 
                  : 'opacity-0 z-[-1]'
              }`}
            >
              <img
                src={imgSrc}
                alt={`Slide ${index + 1}`}
                className="w-full h-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
              />
              {/* Overlay mais escuro - 75% de opacidade */}
              <div className="absolute inset-0 bg-black/75" />
            </div>
          ))}
          
          {/* Fallback enquanto carrega */}
          {loadedImages.length === 0 && (
            <div className="absolute inset-0 bg-gray-900" />
          )}
        </div>
        
        {/* Controles de navegação */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:px-8 z-20">
          <button
            onClick={goToPrevImage}
            className="p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors duration-200"
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          
          <button
            onClick={goToNextImage}
            className="p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors duration-200"
            aria-label="Próxima imagem"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        </div>
        
        {/* Controles inferiores */}
        <div className="absolute bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-20">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors duration-200"
            aria-label={isAutoPlaying ? "Pausar slideshow" : "Reproduzir slideshow"}
          >
            {isAutoPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white" />
            )}
          </button>
          
          <div className="flex gap-2">
            {backgroundImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`transition-all duration-200 ${
                  index === currentImageIndex 
                    ? 'w-6 h-1.5 bg-white' 
                    : 'w-2 h-2 bg-white/50 hover:bg-white/70'
                } rounded-full`}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
          
          <div className="text-white text-xs bg-black/50 px-3 py-1.5 rounded-full">
            <span>{currentImageIndex + 1}</span>
            <span className="mx-1">/</span>
            <span>{backgroundImages.length}</span>
          </div>
        </div>
        
        {/* Conteúdo principal */}
        <div className="container relative z-10 h-full flex flex-col justify-center text-center px-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-5 md:mb-6 mx-auto backdrop-blur-sm font-poppins">
            <BookOpen className="h-4 w-4 flex-shrink-0" />
            <span>Biblioteca NextFit</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 md:mb-6 text-white drop-shadow-lg font-poppins">
            Nextbook, <span className="text-[#8B1DA2]">bora pra leitura?</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/90 max-w-2xl md:max-w-3xl mx-auto mb-8 leading-relaxed drop-shadow font-poppins">
            Biblioteca corporativa desenvolvida para facilitar o agendamento de livros 
            para o desenvolvimento profissional dos colaboradores NextFit.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Botão principal - Roxo sólido */}
            <Link to="/catalogo">
              <Button 
                size="lg" 
                className="gap-2 bg-[#8B1DA2] hover:bg-[#6B147D] text-white px-8 py-6 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200 font-poppins"
              >
                Explorar Catálogo
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            
            {/* Botão secundário */}
            <Link to="/cadastrar">
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/20 px-8 py-6 text-base font-medium transition-all duration-200 bg-transparent font-poppins"
              >
                Criar Conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works - Versão moderna com números e animação */}
      <section className="py-20 md:py-24 bg-white">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16 md:mb-20 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 font-poppins">
              Como funciona o empréstimo
            </h2>
            <p className="text-lg text-gray-600 font-poppins">
              Três passos simples para desenvolver seu PDI através da leitura
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
            {[
              {
                icon: Search,
                title: "Encontre o livro",
                description: "Navegue pelo catálogo digital e encontre o livro ideal para seu desenvolvimento profissional.",
                color: "bg-[#8B1DA2]",
                number: "①",
              },
              {
                icon: Clock,
                title: "Solicite o empréstimo",
                description: "Faça a solicitação pelo sistema e aguarde a confirmação do administrador responsável.",
                color: "bg-[#A64DB5]",
                number: "②",
              },
              {
                icon: CheckCircle,
                title: "Aproveite a leitura",
                description: "Retire o livro com o T.I e inicie sua jornada de aprendizado e crescimento.",
                color: "bg-[#6B147D]",
                number: "③",
              },
            ].map((step, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl p-8 text-center shadow-md border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                {/* Número do passo */}
                <div className="text-4xl mb-4 text-gray-300 group-hover:text-[#8B1DA2] transition-colors duration-300 font-poppins">
                  {step.number}
                </div>
                
                {/* Ícone maior */}
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${step.color} text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <step.icon className="h-10 w-10" />
                </div>
                
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 font-poppins">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed font-poppins">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-gray-50 mt-auto">
        <div className="container text-center">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-2 font-poppins">Biblioteca NextFit</h3>
            <p className="text-sm text-gray-600 font-poppins">Uso interno corporativo</p>
          </div>
          
          <div className="pt-6 border-t border-gray-200">
            <p className="text-gray-600 text-sm font-poppins">
              © {new Date().getFullYear()} Biblioteca NextFit. Todos os direitos reservados.
            </p>
            <p className="text-gray-500 text-xs mt-2 font-poppins">
              Feito com ❤️ por Yago Casagrande
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;