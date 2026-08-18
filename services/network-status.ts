/**
 * Network Status Service
 * Detects online/offline status and connection quality
 */

import { Platform } from 'react-native';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  details: any;
}

class NetworkStatusService {
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private currentStatus: NetworkStatus | null = null;

  /**
   * Initialize network monitoring
   */
  async initialize(): Promise<NetworkStatus> {
    try {
      // Simple network check using fetch
      const isOnline = await this.checkConnection();
      this.currentStatus = {
        isConnected: isOnline,
        isInternetReachable: isOnline,
        type: 'unknown',
        details: null,
      };
      return this.currentStatus;
    } catch (error) {
      console.warn('[NetworkStatus] Failed to fetch network status:', error);
      // Default to offline if we can't determine
      this.currentStatus = {
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
        details: null,
      };
      return this.currentStatus;
    }
  }

  /**
   * Check if device has internet connection
   */
  private async checkConnection(): Promise<boolean> {
    try {
      // Try to fetch a small resource with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current network status
   */
  async getStatus(): Promise<NetworkStatus> {
    if (this.currentStatus) {
      // Return cached status, but also refresh in background
      this.initialize().catch(() => {});
      return this.currentStatus;
    }
    return await this.initialize();
  }

  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    const status = await this.initialize();
    return status.isConnected && (status.isInternetReachable ?? false);
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.add(callback);

    // If we have a cached status, notify immediately
    if (this.currentStatus) {
      callback(this.currentStatus);
    }

    // Poll network status every 5 seconds
    const intervalId = setInterval(async () => {
      const isOnline = await this.checkConnection();
      const newStatus: NetworkStatus = {
        isConnected: isOnline,
        isInternetReachable: isOnline,
        type: 'unknown',
        details: null,
      };

      // Only notify if status changed
      if (!this.currentStatus || this.currentStatus.isConnected !== newStatus.isConnected) {
        this.currentStatus = newStatus;

        // Notify all listeners
        this.listeners.forEach(listener => {
          try {
            listener(this.currentStatus!);
          } catch (error) {
            console.warn('[NetworkStatus] Error in listener:', error);
          }
        });
      }
    }, 5000);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
      clearInterval(intervalId);
    };
  }

  /**
   * Wait for network to come online
   */
  async waitForOnline(timeout: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.currentStatus?.isConnected && this.currentStatus?.isInternetReachable) {
        resolve(true);
        return;
      }

      const unsubscribe = this.subscribe((status) => {
        if (status.isConnected && status.isInternetReachable) {
          unsubscribe();
          resolve(true);
        }
      });

      // Timeout after specified time
      setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);
    });
  }
}

export const networkStatusService = new NetworkStatusService();

