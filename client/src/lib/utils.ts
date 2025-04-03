export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '-';
  }
  
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

export const getServerIdCounter = (): number => {
  const now = new Date();
  const year = now.getFullYear();
  // Get the latest sequence number stored in localStorage or start at 1
  const lastSequence = parseInt(localStorage.getItem(`serverSequence_${year}`) || '0');
  const newSequence = lastSequence + 1;
  
  // Save the updated sequence
  localStorage.setItem(`serverSequence_${year}`, newSequence.toString());
  
  return newSequence;
};

export const generateServerId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const sequence = getServerIdCounter();
  
  // Format: SRV-YYYY-XXX where XXX is a zero-padded sequence number
  return `SRV-${year}-${sequence.toString().padStart(3, '0')}`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const groupByDate = <T extends { createdAt: string | Date }>(
  items: T[] | undefined,
  dateAccessor?: (item: T) => string | Date
): Record<string, T[]> => {
  if (!items || items.length === 0) return {};
  
  return items.reduce((grouped, item) => {
    const date = dateAccessor
      ? dateAccessor(item)
      : item.createdAt;
    
    const dateKey = new Date(date).toLocaleDateString('tr-TR');
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    
    grouped[dateKey].push(item);
    return grouped;
  }, {} as Record<string, T[]>);
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Aktif';
    case 'transit':
      return 'Transfer Sürecinde';
    case 'maintenance':
      return 'Bakımda';
    default:
      return status;
  }
};

export const cn = (...classes: (string | undefined | boolean)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => func(...args), waitFor);
  };
};
