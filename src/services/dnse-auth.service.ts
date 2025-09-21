/**
 * DNSE Authentication Service
 * Handles authentication and token management for DNSE API
 */

import axios, { AxiosInstance } from 'axios';
import { FastifyBaseLogger } from 'fastify';
import {
  DNSECredentials,
  DNSEAuthResponse,
  DNSEInvestorInfo
} from '../types/dnse-market.types';

export class DNSEAuthService {
  private credentials: DNSECredentials;
  private token?: string;
  private investorInfo?: DNSEInvestorInfo;
  private tokenExpiry?: Date;
  private httpClient: AxiosInstance;
  private logger?: FastifyBaseLogger;
  private tokenRefreshTimer?: NodeJS.Timeout;

  constructor(credentials: DNSECredentials, logger?: FastifyBaseLogger) {
    this.credentials = credentials;
    this.logger = logger;
    
    this.httpClient = axios.create({
      baseURL: 'https://api.dnse.com.vn',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  /**
   * Authenticate with DNSE and get JWT token
   */
  async authenticate(): Promise<string> {
    try {
      this.logger?.info('Authenticating with DNSE...');
      
      const response = await this.httpClient.post<DNSEAuthResponse>('/user-service/api/auth', {
        username: this.credentials.username,
        password: this.credentials.password
      });

      if (!response.data?.token) {
        throw new Error('No token received from DNSE');
      }

      this.token = response.data.token;
      // Token valid for 24 hours
      this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      this.logger?.info('DNSE authentication successful');
      
      // Set up automatic token refresh (1 hour before expiry)
      this.setupTokenRefresh();
      
      return this.token;
    } catch (error: any) {
      this.logger?.error({ error: error.message }, 'DNSE authentication failed');
      if (error.response?.data) {
        throw new Error(`Authentication failed: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Get investor information
   */
  async getInvestorInfo(): Promise<DNSEInvestorInfo> {
    if (!this.token) {
      await this.authenticate();
    }

    try {
      this.logger?.info('Fetching investor info from DNSE...');
      
      const response = await this.httpClient.get('/user-service/api/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.data?.investorId) {
        throw new Error('No investor ID received');
      }

      this.investorInfo = {
        investorId: String(response.data.investorId),
        name: response.data.name,
        custodyCode: response.data.custodyCode,
        mobile: response.data.mobile,
        email: response.data.email
      };

      this.logger?.info({ investorId: this.investorInfo.investorId }, 'Investor info retrieved');
      
      return this.investorInfo;
    } catch (error: any) {
      this.logger?.error({ error: error.message }, 'Failed to get investor info');
      if (error.response?.status === 401) {
        // Token expired, re-authenticate
        await this.authenticate();
        return this.getInvestorInfo();
      }
      throw new Error(`Failed to get investor info: ${error.message}`);
    }
  }

  /**
   * Get current token, refreshing if necessary
   */
  async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry) {
      const now = new Date();
      // Refresh if token expires in less than 1 hour
      if (this.tokenExpiry.getTime() - now.getTime() > 60 * 60 * 1000) {
        return this.token;
      }
    }
    
    return await this.authenticate();
  }

  /**
   * Get credentials for MQTT connection
   */
  async getMQTTCredentials(): Promise<{ investorId: string; token: string }> {
    if (!this.investorInfo) {
      await this.getInvestorInfo();
    }
    
    const token = await this.getToken();
    
    return {
      investorId: String(this.investorInfo!.investorId),
      token
    };
  }

  /**
   * Set up automatic token refresh
   */
  private setupTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    if (!this.tokenExpiry) {
      return;
    }

    // Refresh 1 hour before expiry
    const refreshTime = new Date(this.tokenExpiry.getTime() - 60 * 60 * 1000);
    const timeUntilRefresh = Math.max(0, refreshTime.getTime() - Date.now());

    this.tokenRefreshTimer = setTimeout(async () => {
      try {
        this.logger?.info('Refreshing DNSE token...');
        await this.authenticate();
      } catch (error: any) {
        this.logger?.error({ error: error.message }, 'Failed to refresh token');
        // Retry after 1 minute
        setTimeout(() => this.setupTokenRefresh(), 60 * 1000);
      }
    }, timeUntilRefresh);

    this.logger?.debug({ refreshIn: timeUntilRefresh / 1000 / 60 }, 'Token refresh scheduled (minutes)');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }
  }

  /**
   * Get authentication status
   */
  getStatus(): {
    authenticated: boolean;
    investorId?: string;
    tokenExpiresAt?: Date;
  } {
    return {
      authenticated: !!this.token && !!this.tokenExpiry && this.tokenExpiry > new Date(),
      investorId: this.investorInfo?.investorId?.toString(),
      tokenExpiresAt: this.tokenExpiry
    };
  }
}

// Singleton instance
let authServiceInstance: DNSEAuthService | null = null;

/**
 * Get or create DNSE auth service instance
 */
export const getDNSEAuthService = (
  credentials?: DNSECredentials,
  logger?: FastifyBaseLogger
): DNSEAuthService => {
  if (!authServiceInstance && credentials) {
    authServiceInstance = new DNSEAuthService(credentials, logger);
  }
  
  if (!authServiceInstance) {
    throw new Error('DNSE Auth Service not initialized');
  }
  
  return authServiceInstance;
};