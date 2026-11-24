import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);
const KEY = 'brandA_cart';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
}

export const EGP_PER_USD = 50;

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
  }, [items]);

  const add = useCallback((item) => {
    setItems((cur) => (cur.some((i) => i.name === item.name) ? cur : [...cur, { qty: 1, ...item }]));
    setOpen(true);
  }, []);
  const remove = useCallback((name) => setItems((cur) => cur.filter((i) => i.name !== name)), []);
  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, clear, count, total, open, setOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
