import { blockscoutService } from './BlockscoutService';
import { vaultService } from './VaultService';
import { walletConnectService } from './WalletConnectService';

interface ChatContact {
  id: string;
  username?: string;
  address: string;
  lastMessage?: string;
  lastMessageTime?: string;
  transactionCount: number;
  totalValue: string;
  isIncoming: boolean;
  isOutgoing: boolean;
  formattedAddress: string;
  formattedLastInteraction: string;
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
  sender: 'user' | 'contact';
  type: 'text' | 'vault';
  vaultData?: {
    vaultName: string;
    unlockDate: string;
    flowAmount: string;
    mediaUrl?: string;
  };
}

class ChatService {
  /**
   * Get all contacts from blockchain interactions
   */
  async getContacts(): Promise<ChatContact[]> {
    try {
      console.log('📱 Getting chat contacts from vault interactions...');
      
      const currentAddress = walletConnectService.getCurrentAddress();
      if (!currentAddress) {
        console.log('⚠️ No wallet connected');
        return [];
      }

      // Get both blockchain interactions and vault interactions
      const [interactedAddresses, receivedVaults, sentVaults] = await Promise.all([
        blockscoutService.getInteractedAddresses(currentAddress),
        vaultService.getReceivedVaults(),
        vaultService.getSentVaults()
      ]);

      console.log(`📊 Found ${interactedAddresses.length} blockchain interactions`);
      console.log(`📥 Found ${receivedVaults.length} received vaults`);
      console.log(`📤 Found ${sentVaults.length} sent vaults`);

      // Create a map to store unique contacts
      const contactMap = new Map<string, ChatContact>();

      // Process received vaults first
      for (const vault of receivedVaults) {
        try {
          const senderAddress = await vaultService.getAddressByUsername(vault.senderUsername);
          if (!senderAddress) continue;

          const contact: ChatContact = {
            id: senderAddress,
            username: vault.senderUsername,
            address: senderAddress,
            transactionCount: 1,
            totalValue: vault.flowAmount,
            isIncoming: true,
            isOutgoing: false,
            formattedAddress: blockscoutService.formatAddress(senderAddress),
            formattedLastInteraction: blockscoutService.formatTimestamp(vault.createdAt.toString()),
            lastMessageTime: new Date(vault.createdAt * 1000).toISOString()
          };
          contactMap.set(senderAddress.toLowerCase(), contact);
        } catch (error) {
          console.log(`⚠️ Error processing received vault from ${vault.senderUsername}:`, error);
        }
      }

      // Process sent vaults
      for (const vault of sentVaults) {
        try {
          const recipientAddress = await vaultService.getAddressByUsername(vault.recipientUsername);
          if (!recipientAddress) continue;

          const existingContact = contactMap.get(recipientAddress.toLowerCase());
          if (existingContact) {
            // Update existing contact with vault info
            existingContact.transactionCount += 1;
            existingContact.lastMessageTime = new Date(vault.createdAt * 1000).toISOString();
            existingContact.formattedLastInteraction = blockscoutService.formatTimestamp(vault.createdAt.toString());
            existingContact.isOutgoing = true;
          } else {
            // Create new contact from vault
            const contact: ChatContact = {
              id: recipientAddress,
              username: vault.recipientUsername,
              address: recipientAddress,
              transactionCount: 1,
              totalValue: vault.flowAmount,
              isIncoming: false,
              isOutgoing: true,
              formattedAddress: blockscoutService.formatAddress(recipientAddress),
              formattedLastInteraction: blockscoutService.formatTimestamp(vault.createdAt.toString()),
              lastMessageTime: new Date(vault.createdAt * 1000).toISOString()
            };
            contactMap.set(recipientAddress.toLowerCase(), contact);
          }
        } catch (error) {
          console.log(`⚠️ Error processing sent vault to ${vault.recipientUsername}:`, error);
        }
      }

      // Convert map to array and sort by last interaction
      const contacts = Array.from(contactMap.values());
      contacts.sort((a, b) => new Date(b.lastMessageTime || '0').getTime() - new Date(a.lastMessageTime || '0').getTime());

      console.log(`✅ Processed ${contacts.length} total chat contacts`);
      return contacts;

    } catch (error: any) {
      console.error('❌ Error getting chat contacts:', error);
      throw new Error(`Failed to get chat contacts: ${error.message}`);
    }
  }

  /**
   * Get contact by address
   */
  async getContact(address: string): Promise<ChatContact | null> {
    try {
      const contacts = await this.getContacts();
      return contacts.find(contact => contact.address.toLowerCase() === address.toLowerCase()) || null;
    } catch (error) {
      console.error('❌ Error getting contact:', error);
      return null;
    }
  }

  /**
   * Get messages for a specific contact (placeholder for now)
   */
  async getMessages(contactAddress: string): Promise<Message[]> {
    try {
      console.log('💬 Getting messages for contact:', contactAddress);
      
      // For now, return empty messages
      // In the future, this could fetch vault messages from IPFS
      return [];

    } catch (error: any) {
      console.error('❌ Error getting messages:', error);
      return [];
    }
  }

  /**
   * Send a message (placeholder for vault creation)
   */
  async sendMessage(contactAddress: string, content: string): Promise<Message> {
    try {
      console.log('📤 Sending message to:', contactAddress);
      
      // This would integrate with vault creation
      const message: Message = {
        id: Date.now().toString(),
        content,
        timestamp: new Date().toISOString(),
        sender: 'user',
        type: 'text'
      };

      return message;

    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Search contacts by username or address
   */
  async searchContacts(query: string): Promise<ChatContact[]> {
    try {
      const contacts = await this.getContacts();
      
      const searchQuery = query.toLowerCase();
      return contacts.filter(contact => 
        contact.address.toLowerCase().includes(searchQuery) ||
        (contact.username && contact.username.toLowerCase().includes(searchQuery))
      );

    } catch (error: any) {
      console.error('❌ Error searching contacts:', error);
      return [];
    }
  }

  /**
   * Refresh contacts (force reload from blockchain)
   */
  async refreshContacts(): Promise<ChatContact[]> {
    try {
      console.log('🔄 Refreshing contacts from blockchain...');
      return await this.getContacts();
    } catch (error: any) {
      console.error('❌ Error refreshing contacts:', error);
      throw new Error(`Failed to refresh contacts: ${error.message}`);
    }
  }
}

export const chatService = new ChatService();
export type { ChatContact, Message };

