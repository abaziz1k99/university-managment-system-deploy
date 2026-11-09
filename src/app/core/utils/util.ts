export function generateId(prefix: string): string {
    const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
    const time = Date.now().toString(36);
    return `${prefix}-${rand}${time}`.toUpperCase();
}

export function generateStudentId(year: number): string {
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    return `UM-${year}-${seq}`;
}

export function formatDate(date: string | Date, format: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'default' = 'default'): string {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) {
        return 'Invalid Date';
    }
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    if (format === 'DD/MM/YYYY') {
        return `${dd}/${mm}/${yyyy}`;
    }
    if (format === 'YYYY-MM-DD') {
        return `${yyyy}-${mm}-${dd}`;
    }
    return d.toLocaleDateString();
}

export function daysBetween(start: string, end: string): number {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function isFutureDate(date: string): boolean {
    return new Date(date).getTime() > Date.now();
}

export function downloadCsv(filename: string, columns: string[], rows: any[][]): void {
    const csvContent = [columns, ...rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`))].map((r) => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
