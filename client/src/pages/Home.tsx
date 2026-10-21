import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { Copy, Heart, Trash2, Moon, Sun, Search } from 'lucide-react';

interface Quote {
  id: number;
  quote: string;
  author: string;
  favorite: boolean;
  createdAt: Date;
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // tRPC queries and mutations
  const getRandomQuoteMutation = trpc.quotes.getRandomQuote.useMutation();
  const getHistoryQuery = trpc.quotes.getHistory.useQuery();
  const searchQuery_trpc = trpc.quotes.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );
  const toggleFavoriteMutation = trpc.quotes.toggleFavorite.useMutation();
  const clearHistoryMutation = trpc.quotes.clearHistory.useMutation();
  const getFavoritesQuery = trpc.quotes.getFavorites.useQuery();

  const quotes = getHistoryQuery.data?.quotes || [];
  const favorites = getFavoritesQuery.data?.quotes || [];
  const searchResults = searchQuery_trpc.data?.quotes || [];

  // Handle quote generation
  const handleGenerateQuote = async () => {
    setIsLoading(true);
    try {
      const result = await getRandomQuoteMutation.mutateAsync();
      if (result.success && result.quote) {
        setCurrentQuote(result.quote as Quote);
        // Refresh history
        await getHistoryQuery.refetch();
        await getFavoritesQuery.refetch();
      } else {
        toast.error(result.error || 'Failed to fetch quote');
      }
    } catch (error) {
      toast.error('Failed to fetch quote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle copy to clipboard
  const handleCopyQuote = () => {
    if (currentQuote) {
      const text = `"${currentQuote.quote}" — ${currentQuote.author}`;
      navigator.clipboard.writeText(text);
      toast.success('Quote copied to clipboard!');
    }
  };

  // Handle toggle favorite
  const handleToggleFavorite = async (quoteId: number, isFavorite: boolean) => {
    try {
      await toggleFavoriteMutation.mutateAsync({
        id: quoteId,
        favorite: !isFavorite,
      });
      // Update current quote if it's the same
      if (currentQuote?.id === quoteId) {
        setCurrentQuote({ ...currentQuote, favorite: !isFavorite });
      }
      // Refresh both queries
      await getHistoryQuery.refetch();
      await getFavoritesQuery.refetch();
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update favorite');
    }
  };

  // Handle clear history
  const handleClearHistory = async () => {
    try {
      await clearHistoryMutation.mutateAsync();
      setCurrentQuote(null);
      setSearchQuery('');
      await getHistoryQuery.refetch();
      await getFavoritesQuery.refetch();
      toast.success('History cleared');
      setShowClearDialog(false);
    } catch (error) {
      toast.error('Failed to clear history');
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get quotes to display based on active tab and search
  const displayQuotes = activeTab === 'favorites' ? favorites : (searchQuery ? searchResults : quotes);

  useEffect(() => {
    // Generate first quote on mount
    handleGenerateQuote();
  }, []);

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Quote Hub
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quote Card Section */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Current Quote Card */}
              <div className="glass-card p-8 md:p-10 animate-fade-in">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-12 h-12 rounded-full border-4 border-border border-t-accent animate-spin mb-4"></div>
                    <p className="text-muted-foreground">Fetching inspiration...</p>
                  </div>
                ) : currentQuote ? (
                  <div className="space-y-6">
                    <div>
                      <p className="text-2xl md:text-3xl font-serif italic text-foreground mb-4">
                        "{currentQuote.quote}"
                      </p>
                      <p className="text-lg text-muted-foreground">— {currentQuote.author}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={handleGenerateQuote}
                        disabled={isLoading}
                        className="flex-1 md:flex-none bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                      >
                        New Quote
                      </Button>
                      <Button
                        onClick={handleCopyQuote}
                        variant="outline"
                        className="flex-1 md:flex-none"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        onClick={() => handleToggleFavorite(currentQuote.id, currentQuote.favorite)}
                        variant="outline"
                        className={currentQuote.favorite ? 'text-red-500' : ''}
                      >
                        <Heart
                          className="w-4 h-4 mr-2"
                          fill={currentQuote.favorite ? 'currentColor' : 'none'}
                        />
                        {currentQuote.favorite ? 'Favorited' : 'Favorite'}
                      </Button>
                    </div>

                    <div className="text-sm text-muted-foreground pt-4 border-t border-border">
                      Added {formatDate(currentQuote.createdAt)}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* History Panel */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 h-full flex flex-col">
              <h2 className="text-xl font-bold mb-4">History</h2>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search quotes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="favorites">Favorites</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="flex-1 overflow-y-auto">
                  {searchQuery && searchResults.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No quotes found
                    </div>
                  ) : displayQuotes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No quotes yet. Generate one!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayQuotes.map((quote) => (
                        <div
                          key={quote.id}
                          className="p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors cursor-pointer group"
                        >
                          <p className="text-sm font-medium line-clamp-2 mb-2">
                            {quote.quote}
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            {quote.author}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              {formatDate(quote.createdAt)}
                            </p>
                            <button
                              onClick={() => handleToggleFavorite(quote.id, quote.favorite)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Heart
                                className="w-3 h-3"
                                fill={quote.favorite ? 'currentColor' : 'none'}
                                color={quote.favorite ? '#ef4444' : 'currentColor'}
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="favorites" className="flex-1 overflow-y-auto">
                  {favorites.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No favorites yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {favorites.map((quote) => (
                        <div
                          key={quote.id}
                          className="p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors cursor-pointer group"
                        >
                          <p className="text-sm font-medium line-clamp-2 mb-2">
                            {quote.quote}
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            {quote.author}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              {formatDate(quote.createdAt)}
                            </p>
                            <button
                              onClick={() => handleToggleFavorite(quote.id, quote.favorite)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Heart
                                className="w-3 h-3"
                                fill={quote.favorite ? 'currentColor' : 'none'}
                                color={quote.favorite ? '#ef4444' : 'currentColor'}
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Clear History Button */}
              {quotes.length > 0 && (
                <Button
                  onClick={() => setShowClearDialog(true)}
                  variant="outline"
                  className="w-full mt-4 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear History
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Clear History Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All History?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All stored quotes will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearHistory}
              disabled={clearHistoryMutation.isPending}
            >
              {clearHistoryMutation.isPending ? 'Clearing...' : 'Clear All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
