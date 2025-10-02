/**
 * Reusable Modal component
 * Overlay modal for dialogs, combat, trading, etc.
 */

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  canClose?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Modal dialog component
 * @param isOpen - Whether modal is visible
 * @param onClose - Function to call when closing (if closeable)
 * @param title - Modal title
 * @param children - Modal content
 * @param canClose - Whether user can close the modal
 * @param size - Modal size
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  canClose = true,
  size = 'medium',
}: ModalProps) {
  if (!isOpen) return null;

  // Handle click on backdrop (close if allowed)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (canClose && onClose && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`modal modal-${size}`}>
        {/* Modal header with optional close button */}
        <div className="modal-header">
          {title && <h2 className="modal-title">{title}</h2>}
          {canClose && onClose && (
            <button className="modal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>

        {/* Modal content */}
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}
