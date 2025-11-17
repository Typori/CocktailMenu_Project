import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown } from 'lucide-react';

export function ScrollButtons() {
  const scrollToTop = () => {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({ 
      top: document.documentElement.scrollHeight, 
      behavior: 'smooth' 
    });
  };

  return (
    <div className="fixed right-[calc((100vw-min(1280px,100%))/2+1rem)] bottom-20 z-40 flex flex-col gap-2">
      <Button
        size="icon"
        variant="outline"
        onClick={scrollToTop}
        className="touch-feedback shadow-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-10 w-10"
        title="回到顶部"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={scrollToBottom}
        className="touch-feedback shadow-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-10 w-10"
        title="去到底部"
      >
        <ArrowDown className="h-5 w-5" />
      </Button>
    </div>
  );
}
