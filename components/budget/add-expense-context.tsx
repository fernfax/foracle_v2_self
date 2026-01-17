"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AddExpenseContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const AddExpenseContext = createContext<AddExpenseContextType | null>(null);

export function AddExpenseProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AddExpenseContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </AddExpenseContext.Provider>
  );
}

export function useAddExpense() {
  const context = useContext(AddExpenseContext);
  if (!context) {
    throw new Error("useAddExpense must be used within an AddExpenseProvider");
  }
  return context;
}
