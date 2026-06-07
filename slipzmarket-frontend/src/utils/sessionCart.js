// Local storage cart utilities for persistent offline shopping

const LOCAL_CART_KEY = 'slipz_local_cart';
const PENDING_SYNC_KEY = 'slipz_pending_sync';

// Get cart from local storage (array of items: { id, package, quantity })
export const getLocalCart = () => {
  try {
    const cart = localStorage.getItem(LOCAL_CART_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch (e) {
    console.error('Failed to parse local cart:', e);
    return [];
  }
};

export const setLocalCart = (arr) => {
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(arr || []));
  } catch (e) {
    console.error('Failed to set local cart:', e);
  }
};

// Add or update item in local cart. Accepts either item object or an id with optional data
export const addToLocalCart = (item) => {
  const cart = getLocalCart();
  const id = typeof item === 'string' ? item : item?.id;
  const existing = cart.find(i => i.id === id);
  if (existing) {
    // increment quantity
    existing.quantity = Math.max(1, Number(existing.quantity || 1) + 1);
  } else {
    const payload = typeof item === 'string' ? { id, package: null, quantity: 1 } : { id: item.id, package: item.package || item, quantity: item.quantity || 1 };
    cart.push(payload);
  }
  setLocalCart(cart);
  return cart;
};

// Remove item from local cart
export const removeFromLocalCart = (packageId) => {
  const cart = getLocalCart();
  const updated = cart.filter(i => i.id !== packageId);
  setLocalCart(updated);
  return updated;
};

// Clear local cart
export const clearLocalCart = () => {
  try {
    localStorage.removeItem(LOCAL_CART_KEY);
  } catch (e) {
    console.error('Failed to clear local cart', e);
  }
};

// Mark cart for sync after login
export const markPendingSync = () => {
  try { localStorage.setItem(PENDING_SYNC_KEY, 'true'); } catch { /* ignore */ }
};

// Check if cart needs syncing
export const hasPendingSync = () => {
  return localStorage.getItem(PENDING_SYNC_KEY) === 'true';
};

// Clear pending sync flag
export const clearPendingSync = () => {
  try { localStorage.removeItem(PENDING_SYNC_KEY); } catch { /* ignore */ }
};

// Check if user is logged in
export const isLoggedIn = () => {
  return !!localStorage.getItem('slipz_token');
};
