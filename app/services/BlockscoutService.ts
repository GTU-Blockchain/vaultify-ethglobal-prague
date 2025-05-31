interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  blockNumber: string;
  functionName?: string;
  isError: string;
}

interface InteractedAddress {
  address: string;
  username?: string;
  lastInteraction: string;
  transactionCount: number;
  totalValue: string;
  isIncoming: boolean;
  isOutgoing: boolean;
}

class BlockscoutService {
  private baseUrl: string;

  constructor() {
    // Flow EVM Testnet Blockscout API
    this.baseUrl = 'https://evm-testnet.flowscan.io/api';
  }

  /**
   * Get transaction history for an address
   */
  async getTransactionHistory(address: string, page: number = 1, offset: number = 100): Promise<Transaction[]> {
    try {
      console.log('🔍 Fetching transaction history for:', address);
      
      const url = `${this.baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=desc`;
      
      console.log('📡 Blockscout API URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Blockscout response:', data);

      if (data.status !== '1') {
        console.log('⚠️ Blockscout API returned error:', data.message);
        return [];
      }

      return data.result || [];

    } catch (error: any) {
      console.error('❌ Error fetching transaction history:', error);
      throw new Error(`Failed to fetch transaction history: ${error.message}`);
    }
  }

  /**
   * Get internal transactions (contract calls)
   */
  async getInternalTransactions(address: string, page: number = 1, offset: number = 100): Promise<Transaction[]> {
    try {
      console.log('🔍 Fetching internal transactions for:', address);
      
      const url = `${this.baseUrl}?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=desc`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status !== '1') {
        console.log('⚠️ Internal transactions API returned error:', data.message);
        return [];
      }

      return data.result || [];

    } catch (error: any) {
      console.error('❌ Error fetching internal transactions:', error);
      return []; // Return empty array instead of throwing for internal transactions
    }
  }

  /**
   * Get all unique addresses that interacted with the user
   */
  async getInteractedAddresses(userAddress: string): Promise<InteractedAddress[]> {
    try {
      console.log('🔄 Getting all interacted addresses for:', userAddress);

      // Get both regular and internal transactions
      const [regularTxs, internalTxs] = await Promise.all([
        this.getTransactionHistory(userAddress),
        this.getInternalTransactions(userAddress)
      ]);

      const allTransactions = [...regularTxs, ...internalTxs];
      console.log(`📊 Total transactions found: ${allTransactions.length}`);

      // Process transactions to find unique addresses
      const addressMap = new Map<string, {
        address: string;
        transactions: Transaction[];
        totalValue: bigint;
        isIncoming: boolean;
        isOutgoing: boolean;
        lastInteraction: string;
      }>();

      for (const tx of allTransactions) {
        const isOutgoing = tx.from.toLowerCase() === userAddress.toLowerCase();
        const isIncoming = tx.to.toLowerCase() === userAddress.toLowerCase();
        
        // Skip if neither incoming nor outgoing (shouldn't happen)
        if (!isOutgoing && !isIncoming) continue;

        // Get the other party's address
        const otherAddress = isOutgoing ? tx.to : tx.from;
        
        // Skip if other address is null or empty
        if (!otherAddress || otherAddress === '0x' || otherAddress.toLowerCase() === userAddress.toLowerCase()) {
          continue;
        }

        const addressLower = otherAddress.toLowerCase();
        
        if (!addressMap.has(addressLower)) {
          addressMap.set(addressLower, {
            address: otherAddress,
            transactions: [],
            totalValue: BigInt(0),
            isIncoming: false,
            isOutgoing: false,
            lastInteraction: tx.timeStamp
          });
        }

        const addressData = addressMap.get(addressLower)!;
        addressData.transactions.push(tx);
        addressData.totalValue += BigInt(tx.value || '0');
        
        if (isIncoming) addressData.isIncoming = true;
        if (isOutgoing) addressData.isOutgoing = true;
        
        // Update last interaction if this transaction is more recent
        if (parseInt(tx.timeStamp) > parseInt(addressData.lastInteraction)) {
          addressData.lastInteraction = tx.timeStamp;
        }
      }

      // Convert to result format
      const result: InteractedAddress[] = Array.from(addressMap.values()).map(data => ({
        address: data.address,
        lastInteraction: data.lastInteraction,
        transactionCount: data.transactions.length,
        totalValue: data.totalValue.toString(),
        isIncoming: data.isIncoming,
        isOutgoing: data.isOutgoing
      }));

      // Sort by last interaction (most recent first)
      result.sort((a, b) => parseInt(b.lastInteraction) - parseInt(a.lastInteraction));

      console.log(`✅ Found ${result.length} unique interacted addresses`);
      return result;

    } catch (error: any) {
      console.error('❌ Error getting interacted addresses:', error);
      throw new Error(`Failed to get interacted addresses: ${error.message}`);
    }
  }

  /**
   * Get transaction details by hash
   */
  async getTransactionDetails(txHash: string): Promise<Transaction | null> {
    try {
      const url = `${this.baseUrl}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.result) {
        return null;
      }

      return {
        hash: data.result.hash,
        from: data.result.from,
        to: data.result.to,
        value: data.result.value,
        timeStamp: '', // Will need to get from block
        blockNumber: data.result.blockNumber,
        isError: '0'
      };

    } catch (error: any) {
      console.error('❌ Error fetching transaction details:', error);
      return null;
    }
  }

  /**
   * Format address for display (show first 6 and last 4 characters)
   */
  formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Format timestamp to readable date
   */
  formatTimestamp(timestamp: string): string {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  /**
   * Format value from Wei to FLOW
   */
  formatValue(value: string): string {
    try {
      const flowValue = parseFloat(value) / Math.pow(10, 18);
      return flowValue.toFixed(4) + ' FLOW';
    } catch {
      return '0 FLOW';
    }
  }
}

export const blockscoutService = new BlockscoutService();
export type { InteractedAddress, Transaction };

