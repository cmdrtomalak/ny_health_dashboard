import { motion, AnimatePresence } from 'framer-motion';
import './LoadingModal.css';

interface LoadingModalProps {
    isVisible: boolean;
}

export function LoadingModal({ isVisible }: LoadingModalProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="loading-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="loading-modal-content"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <div className="loading-spinner-circle"></div>
                        <h3 className="loading-text">Loading..</h3>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
