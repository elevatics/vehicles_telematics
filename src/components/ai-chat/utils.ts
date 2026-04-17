export function assistantNotStarted(messages: { role: string }[]) {
  const last = messages[messages.length - 1];
  return last?.role === 'user';
}

export function isAddressQuery(text: string) {
  return /\b(address|location|where|street|map)\b/i.test(text);
}

export function containsStreetAddress(text: string) {
  return /\b(address|street|road|avenue|lane|blvd|drive|sector|block|near)\b/i.test(text);
}
