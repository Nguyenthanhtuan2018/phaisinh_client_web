import { onMounted, onUnmounted } from 'vue';

export function useKeyboardShortcuts(handlers: {
  onToggleMain?: () => void;
  onTogglePrime?: () => void;
  onToggleLayer?: () => void;
  onFullscreen?: () => void;
  onStart?: () => void;
  onStop?: () => void;
  onAuto?: () => void;
  onLock?: () => void;
  onReset?: () => void;
}) {
  function handleKeydown(e: KeyboardEvent) {
    // Ignore if typing in input/textarea/select
    const target = e.target as HTMLElement;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
      return;
    }

    const key = e.key.toLowerCase();

    switch (key) {
      case 'm':
        handlers.onToggleMain?.();
        break;
      case 'p':
        handlers.onTogglePrime?.();
        break;
      case 'l':
        handlers.onToggleLayer?.();
        break;
      case 'f':
        handlers.onFullscreen?.();
        break;
      case 's':
        if (e.shiftKey) {
          handlers.onStop?.();
        } else {
          handlers.onStart?.();
        }
        break;
      case 'a':
        handlers.onAuto?.();
        break;
      case 'k':
        handlers.onLock?.();
        break;
      case 'r':
        if (e.shiftKey) {
          handlers.onReset?.();
        }
        break;
      case 'escape':
        // Cancel any selection mode
        break;
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
}
