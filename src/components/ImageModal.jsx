import { useState } from 'react';
import '../styles/ImageModal.css';

export default function ImageModal({ src, alt, children }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div onClick={() => setShowModal(true)} style={{ cursor: 'pointer' }}>
        {children}
      </div>
      {showModal && (
        <div className="image-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            <img src={src} alt={alt} className="modal-image" />
          </div>
        </div>
      )}
    </>
  );
}
