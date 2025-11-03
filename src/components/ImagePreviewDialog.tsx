import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ImageIcon } from 'lucide-react';

interface ImagePreviewDialogProps {
  src: string;
  alt: string;
  trigger?: React.ReactNode;
  className?: string;
}

export function ImagePreviewDialog({ src, alt, trigger, className = '' }: ImagePreviewDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <div className={`cursor-pointer group ${className}`}>
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-white" />
            </div>
          </div>
        )}
      </DialogTrigger>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent overflow-hidden"
        onClick={(e) => {
          // 点击图片本身不关闭
          if ((e.target as HTMLElement).tagName === 'IMG') {
            e.stopPropagation();
          }
        }}
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[95vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
