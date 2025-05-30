import React, { createContext, useContext, useState, useEffect } from 'react';
import * as fcl from '@onflow/fcl';

interface FCLContextType {
  user: any;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  sendTransaction: (amount: number, recipient: string) => Promise<string>;
}

const FCLContext = createContext<FCLContextType | undefined>(undefined);

export const FCLProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fcl.config({
      'accessNode.api': 'https://rest-testnet.onflow.org',
      'discovery.wallet': 'https://fcl-discovery.onflow.org/testnet/authn',
    });

    fcl.currentUser().subscribe(setUser);
  }, []);

  const login = async () => {
    try {
      await fcl.authenticate();
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await fcl.unauthenticate();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const sendTransaction = async (amount: number, recipient: string) => {
    try {
      const transactionId = await fcl.mutate({
        cadence: `
          transaction(amount: UFix64, recipient: Address) {
            prepare(signer: AuthAccount) {
              // Transaction logic here
            }
          }
        `,
        args: (arg: any, t: any) => [
          arg(amount, t.UFix64),
          arg(recipient, t.Address),
        ],
      });
      return transactionId;
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  };

  return (
    <FCLContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        sendTransaction,
      }}
    >
      {children}
    </FCLContext.Provider>
  );
};

export const useFCL = () => {
  const context = useContext(FCLContext);
  if (context === undefined) {
    throw new Error('useFCL must be used within a FCLProvider');
  }
  return context;
}; 