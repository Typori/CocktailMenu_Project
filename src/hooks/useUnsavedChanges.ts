import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation, UNSAFE_NavigationContext } from 'react-router-dom';
import { useContext } from 'react';

/**
 * Hook to handle unsaved changes warning
 * @param hasUnsavedChanges - Whether there are unsaved changes
 * @param onSave - Function to save changes
 * @returns Object with navigation control functions
 */
export function useUnsavedChanges(
  hasUnsavedChanges: boolean,
  onSave: () => Promise<void>
) {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isNavigatingRef = useRef(false);
  const navigationContext = useContext(UNSAFE_NavigationContext);

  // Prevent browser navigation (refresh, close tab, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isNavigatingRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Intercept in-app navigation
  useEffect(() => {
    if (!navigationContext?.navigator) return;

    const { navigator } = navigationContext;
    const originalPush = navigator.push;
    const originalReplace = navigator.replace;

    // Override push method
    navigator.push = function (to: any, state?: any) {
      if (hasUnsavedChanges && !isNavigatingRef.current) {
        const targetPath = typeof to === 'string' ? to : to.pathname;
        if (targetPath !== location.pathname) {
          setPendingNavigation(targetPath);
          setShowDialog(true);
          return;
        }
      }
      originalPush.call(this, to, state);
    };

    // Override replace method
    navigator.replace = function (to: any, state?: any) {
      if (hasUnsavedChanges && !isNavigatingRef.current) {
        const targetPath = typeof to === 'string' ? to : to.pathname;
        if (targetPath !== location.pathname) {
          setPendingNavigation(targetPath);
          setShowDialog(true);
          return;
        }
      }
      originalReplace.call(this, to, state);
    };

    return () => {
      navigator.push = originalPush;
      navigator.replace = originalReplace;
    };
  }, [hasUnsavedChanges, location.pathname, navigationContext]);

  const handleSaveAndNavigate = useCallback(async () => {
    try {
      await onSave();
      isNavigatingRef.current = true;
      setShowDialog(false);
      if (pendingNavigation) {
        setTimeout(() => {
          navigate(pendingNavigation);
          isNavigatingRef.current = false;
        }, 0);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('保存失败，请重试');
      isNavigatingRef.current = false;
    }
  }, [onSave, pendingNavigation, navigate]);

  const handleDiscardAndNavigate = useCallback(() => {
    isNavigatingRef.current = true;
    setShowDialog(false);
    if (pendingNavigation) {
      setTimeout(() => {
        navigate(pendingNavigation);
        isNavigatingRef.current = false;
      }, 0);
    }
  }, [pendingNavigation, navigate]);

  const handleCancelNavigation = useCallback(() => {
    setShowDialog(false);
    setPendingNavigation(null);
  }, []);

  return {
    showDialog,
    handleSaveAndNavigate,
    handleDiscardAndNavigate,
    handleCancelNavigation,
  };
}
