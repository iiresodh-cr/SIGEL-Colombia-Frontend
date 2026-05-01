import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Button, 
  Box 
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

type ModalType = 'success' | 'error' | 'info';

interface ModalContextType {
  showModal: (title: string, message: string, type?: ModalType) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ModalType>('info');

  const showModal = (newTitle: string, newMessage: string, newType: ModalType = 'info') => {
    setTitle(newTitle);
    setMessage(newMessage);
    setType(newType);
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const getIcon = () => {
    switch (type) {
      case 'success': 
        return <CheckCircleOutlineIcon sx={{ fontSize: 56, color: '#2e7d32', mb: 1 }} />;
      case 'error': 
        return <ErrorOutlineIcon sx={{ fontSize: 56, color: '#d32f2f', mb: 1 }} />;
      default: 
        return <InfoOutlinedIcon sx={{ fontSize: 56, color: '#003366', mb: 1 }} />;
    }
  };

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}
      
      <Dialog 
        open={open} 
        onClose={handleClose} 
        slotProps={{
          paper: {
            sx: { 
              borderRadius: 4, 
              padding: 2, 
              minWidth: 350, 
              textAlign: 'center', 
              boxShadow: '0px 10px 30px rgba(0,0,0,0.1)' 
            }
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
          {getIcon()}
          <DialogTitle sx={{ fontWeight: 800, p: 0, mb: 1, color: '#1e293b' }}>
            {title}
          </DialogTitle>
        </Box>
        
        <DialogContent sx={{ pb: 1 }}>
          <DialogContentText sx={{ color: 'text.secondary', fontSize: '1rem' }}>
            {message}
          </DialogContentText>
        </DialogContent>
        
        <DialogActions sx={{ justifyContent: 'center', pb: 2, mt: 1 }}>
          <Button 
            onClick={handleClose} 
            variant="contained" 
            disableElevation 
            sx={{ 
              px: 4, 
              py: 1,
              fontWeight: 'bold', 
              borderRadius: 2,
              bgcolor: type === 'error' ? '#d32f2f' : '#003366',
              '&:hover': { bgcolor: type === 'error' ? '#b71c1c' : '#002244' }
            }}
          >
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal debe usarse dentro de ModalProvider');
  return context;
};