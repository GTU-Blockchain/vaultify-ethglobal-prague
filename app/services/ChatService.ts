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
      console.log('📱 Getting chat contacts from blockchain interactions...');
      
      const currentAddress = walletConnectService.getCurrentAddress();
      if (!currentAddress) {
        console.log('⚠️ No wallet connected');
        return [];
      }

      // Get interacted addresses from Blockscout
      const interactedAddresses = await blockscoutService.getInteractedAddresses(currentAddress);
      console.log(`📊 Found ${interactedAddresses.length} interacted addresses`);

      // Convert to chat contacts and resolve usernames
      const contacts: ChatContact[] = [];
      
      for (const address of interactedAddresses) {
        try {
          console.log(`👤 Resolving username for address: ${address.address}`);
          
          // Try to resolve username for this specific address
          const username = await vaultService.getUsernameByAddress(address.address);
          console.log(`📋 Username result for ${address.address}:`, username);
          
          const contact: ChatContact = {
            id: address.address,
            username: username || undefined,
            address: address.address,
            transactionCount: address.transactionCount,
            totalValue: address.totalValue,
            isIncoming: address.isIncoming,
            isOutgoing: address.isOutgoing,
            formattedAddress: blockscoutService.formatAddress(address.address),
            formattedLastInteraction: blockscoutService.formatTimestamp(address.lastInteraction),
            lastMessageTime: address.lastInteraction
          };

          contacts.push(contact);
          
          if (username) {
            console.log(`✅ Resolved username "${username}" for ${address.address}`);
          } else {
            console.log(`📝 No username found for ${address.address}`);
          }
          
        } catch (error) {
          console.log(`⚠️ Error processing address ${address.address}:`, error);
          
          // Add contact without username
          const contact: ChatContact = {
            id: address.address,
            username: undefined,
            address: address.address,
            transactionCount: address.transactionCount,
            totalValue: address.totalValue,
            isIncoming: address.isIncoming,
            isOutgoing: address.isOutgoing,
            formattedAddress: blockscoutService.formatAddress(address.address),
            formattedLastInteraction: blockscoutService.formatTimestamp(address.lastInteraction),
            lastMessageTime: address.lastInteraction
          };

          contacts.push(contact);
        }
      }

      console.log(`✅ Processed ${contacts.length} chat contacts`);
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

