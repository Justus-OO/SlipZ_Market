// src/services/dashboard.service.ts
import prisma from '../db';

export const DashboardService = {
  /**
   * Helper to compute the explicit starting date of the selected timeframe
   */
  getStartDate(range: string): Date {
    const now = new Date();
    switch (range) {
      case '24H': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7D':  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30D': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'YTD': return new Date(now.getFullYear(), 0, 1);
      default:    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  },

  /**
   * Calculates structural trend percentages between current and past windows safely
   */
  calculateTrend(current: number, previous: number): { trend: string; isUp: boolean } {
    if (previous === 0) {
      return { trend: current > 0 ? '+100.0%' : '0.0%', isUp: current >= 0 };
    }
    const diffPercent = ((current - previous) / previous) * 100;
    return {
      trend: `${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(1)}%`,
      isUp: diffPercent >= 0
    };
  },

  /**
   * Main statistical assembler pulling data across your specific Prisma tables
   */
  async getOverviewData(timeRange: string) {
    const startDate = this.getStartDate(timeRange);
    const now = new Date();
    const windowMs = now.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - windowMs);

    // --- 1. REVENUE KPI ---
    const [currentRevAgg, prevRevAgg] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: 'COMPLETED', date: { gte: startDate, lt: now } },
        _sum: { amount: true }
      }),
      prisma.invoice.aggregate({
        where: { status: 'COMPLETED', date: { gte: previousStartDate, lt: startDate } },
        _sum: { amount: true }
      })
    ]);

    const revCurrent = Number(currentRevAgg._sum.amount || 0);
    const revPrev = Number(prevRevAgg._sum.amount || 0);
    const revTrendResult = this.calculateTrend(revCurrent, revPrev);

    // --- 2. WORKSPACE & USER METRICS ---
    const [totalWorkspaces, newWorkspaceCount, totalUsers, newUsersCount, prevNewUsersCount] = await Promise.all([
      prisma.workspace.count(),
      prisma.workspace.count({ where: { createdAt: { gte: startDate, lt: now } } }),
      prisma.user.count({ where: { isBlacklisted: false } }),
      prisma.user.count({ where: { createdAt: { gte: startDate, lt: now } } }),
      prisma.user.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } })
    ]);
    const userTrendResult = this.calculateTrend(newUsersCount, prevNewUsersCount);
    const wsTrendResult = this.calculateTrend(newWorkspaceCount, await prisma.workspace.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } }));

    // --- 3. DATASETS EXPORTED (Unlocked Leads Total Volumes) ---
    const [currentExports, prevExports] = await Promise.all([
      prisma.unlockedLead.count({ where: { unlockedAt: { gte: startDate, lt: now } } }),
      prisma.unlockedLead.count({ where: { unlockedAt: { gte: previousStartDate, lt: startDate } } })
    ]);
    const exportTrendResult = this.calculateTrend(currentExports, prevExports);

    // --- 4. OPEN SUPPORT TICKETS ---
    const [openTicketsCount, prevOpenTicketsCount, totalTicketsEver] = await Promise.all([
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'REVIEWING'] } } }),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'REVIEWING'] }, createdAt: { gte: previousStartDate, lt: startDate } } }),
      prisma.supportTicket.count()
    ]);
    const ticketsTrendResult = this.calculateTrend(openTicketsCount, prevOpenTicketsCount);

    // --- 5. SYSTEM HEALTH VIA DYNAMIC INJECTION ENGINE ---
    const settings = await prisma.globalSettings.findUnique({ where: { id: 'singleton' } });
    const systemHealth = [
      { service: 'Main API Gateway', status: settings?.maintenanceMode ? 'Degraded' : 'Operational', uptime: '99.99%', icon: 'Server' },
      { service: 'SMTP Delivery', status: settings?.secretKey ? 'Operational' : 'Degraded', uptime: '99.95%', icon: 'Mail' },
      { service: 'Payment Processor', status: settings?.secretKey ? 'Operational' : 'Degraded', uptime: '99.90%', icon: 'DollarSign' },
      { service: 'Data Enrichment', status: 'Operational', uptime: '100%', icon: 'Zap' }
    ];

    // --- 6. GLOBAL ACTIVITY AUDIT TRAIL ---
    const rawLogs = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    const userIds = [...new Set(rawLogs.map(log => log.userId))].filter(Boolean);
    const userList = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true }
    }) : [];
    const userMap = new Map(userList.map(user => [user.id, user.email]));

    const activities = rawLogs.map((log) => {
      const metadata = log.metadata as any;
      const email = userMap.get(log.userId) || 'system_auto';
      const minutesDiff = Math.floor((Date.now() - log.createdAt.getTime()) / 60000);
      let timeString = `${minutesDiff} mins ago`;
      if (minutesDiff < 1) timeString = 'Just now';
      else if (minutesDiff >= 60) {
        const hours = Math.floor(minutesDiff / 60);
        timeString = hours === 1 ? '1 hour ago' : `${hours} hours ago`;
        if (hours >= 24) timeString = `${Math.floor(hours / 24)} days ago`;
      }

      return {
        id: log.id,
        user: email,
        action: this.formatActionText(log.action, metadata),
        time: timeString,
        amount: metadata?.amountPaid ? Number(metadata.amountPaid) : null,
        status: log.action === 'PAYMENT_CONFIRMED' ? 'Completed' : 'System'
      };
    });

    const chart = await this.generateChartData(timeRange, startDate, now);

    return {
      kpis: [
        { label: `Revenue (${timeRange})`, value: `£${revCurrent.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, trend: revTrendResult.trend, isUp: revTrendResult.isUp, icon: 'DollarSign' },
        { label: 'Total Workspaces', value: totalWorkspaces.toString(), trend: wsTrendResult.trend, isUp: wsTrendResult.isUp, icon: 'Users' },
        { label: `New Signups (${timeRange})`, value: newUsersCount.toString(), trend: userTrendResult.trend, isUp: userTrendResult.isUp, icon: 'Activity' },
        { label: 'Datasets Exported', value: currentExports.toLocaleString('en-GB'), trend: exportTrendResult.trend, isUp: exportTrendResult.isUp, icon: 'Database' },
        { label: 'Support Tickets', value: openTicketsCount.toString(), trend: ticketsTrendResult.trend, isUp: openTicketsCount === 0, icon: 'AlertTriangle' }
      ],
      chart,
      activities,
      systemHealth
    };
  },

  /**
   * Formatting text definitions natively matching explicit system hooks
   */
  formatActionText(action: string, metadata: any): string {
    switch (action) {
      case 'PAYMENT_CONFIRMED':
        return `Purchased ${metadata?.leadsUnlocked || 0} Email Leads`;
      case 'PAYMENT_FAILED':
        return `Failed Transaction attempt (Ref: ${metadata?.invoiceId || 'N/A'})`;
      case 'CHECKOUT_INITIATED':
        return 'Initiated Checkout Session';
      default:
        return action.replace(/_/g, ' ');
    }
  },

  /**
   * Groups completed revenue numbers directly by intervals into chronological bars
   */
  async generateChartData(range: string, startDate: Date, endDate: Date) {
    const completedInvoices = await prisma.invoice.findMany({
      where: { status: 'COMPLETED', date: { gte: startDate, lt: endDate } },
      select: { amount: true, date: true },
      orderBy: { date: 'asc' }
    });

    if (range === '24H') {
      const bars = Array.from({ length: 6 }, (_, i) => {
        const hour = new Date(endDate.getTime() - (5 - i) * 4 * 60 * 60 * 1000);
        return { label: `${String(hour.getHours()).padStart(2, '0')}:00`, rawSum: 0, value: 0 };
      });

      completedInvoices.forEach(inv => {
        const index = Math.min(Math.floor(inv.date.getHours() / 4), 5);
        bars[index].rawSum += Number(inv.amount);
      });

      return this.normalizeChartScale(bars).map(b => ({ ...b, amount: b.rawSum }));
    }

    if (range === '7D') {
      const labels = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - (6 - i));
        return { label: day.toLocaleDateString('en-GB', { weekday: 'short' }), date: day };
      });

      const bars = labels.map(({ label }) => ({ label, rawSum: 0, value: 0 }));
      
      completedInvoices.forEach(inv => {
        const dayLabel = inv.date.toLocaleDateString('en-GB', { weekday: 'short' });
        const idx = bars.findIndex(b => b.label === dayLabel);
        if (idx !== -1) bars[idx].rawSum += Number(inv.amount);
      });

      return this.normalizeChartScale(bars).map(b => ({ ...b, amount: b.rawSum }));
    }

    if (range === '30D') {
      const labels = Array.from({ length: 30 }, (_, i) => {
        const day = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - (29 - i));
        return { label: day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), date: day };
      });
      const bars = labels.map(({ label }) => ({ label, rawSum: 0, value: 0 }));

      completedInvoices.forEach(inv => {
        const idx = Math.floor((inv.date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        if (idx >= 0 && idx < bars.length) bars[idx].rawSum += Number(inv.amount);
      });

      return this.normalizeChartScale(bars).map(b => ({ ...b, amount: b.rawSum }));
    }

    if (range === 'YTD') {
      const lastMonth = endDate.getMonth();
      const bars = Array.from({ length: lastMonth + 1 }, (_, i) => ({
        label: new Date(endDate.getFullYear(), i, 1).toLocaleString('en-GB', { month: 'short' }),
        rawSum: 0,
        value: 0
      }));

      completedInvoices.forEach(inv => {
        const idx = inv.date.getMonth();
        if (idx >= 0 && idx < bars.length) bars[idx].rawSum += Number(inv.amount);
      });

      return this.normalizeChartScale(bars).map(b => ({ ...b, amount: b.rawSum }));
    }

    return [];
  },

  /**
   * Normalizes values on a 0-100 scale so they align with the frontend CSS height percentages
   */
  normalizeChartScale(bars: { label: string; rawSum: number; value: number }[]) {
    const maxVal = Math.max(...bars.map(b => b.rawSum), 0);
    return bars.map(b => ({
      label: b.label,
      value: maxVal === 0 ? 10 : Math.max(Math.floor((b.rawSum / maxVal) * 100), 12),
      rawSum: b.rawSum
    }));
  }
};