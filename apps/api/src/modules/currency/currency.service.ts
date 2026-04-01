import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private cachedRub = 90; // fallback rate
  private cachedAt = 0;
  private readonly TTL = 60 * 60 * 1000; // 1 hour

  async getUsdToRub(): Promise<number> {
    if (Date.now() - this.cachedAt < this.TTL) return this.cachedRub;
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = (await res.json()) as any;
      if (data?.rates?.RUB) {
        this.cachedRub = data.rates.RUB;
        this.cachedAt = Date.now();
        this.logger.log(`Exchange rate updated: 1 USD = ${this.cachedRub} RUB`);
      }
    } catch (e) {
      this.logger.warn('Failed to fetch exchange rate, using cached value', e);
    }
    return this.cachedRub;
  }

  async getRates() {
    const rub = await this.getUsdToRub();
    return {
      USD: 1,
      RUB: rub,
      lastUpdated: this.cachedAt ? new Date(this.cachedAt).toISOString() : null,
    };
  }
}
