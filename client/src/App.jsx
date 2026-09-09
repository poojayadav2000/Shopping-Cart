import { useEffect, useState } from 'react';
import { ArrowRight, Edit3, Mail, MapPin, Minus, Phone, Plus, ShoppingBag, Sparkles, Trash2, X } from 'lucide-react';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [savingProductId, setSavingProductId] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', imageUrl: '', inventory: '' });

  useEffect(() => {
    fetch('/api/products')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load products.');
        return response.json();
      })
      .then(setProducts)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (product) => {
    setError('');
    setMessage(`${product.name} added to your cart.`);
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => item.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, product.inventory) }
          : item);
      }
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    setAddingProduct(true);
    setError('');
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProduct, price: Number(newProduct.price), inventory: Number(newProduct.inventory) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setProducts((current) => [...current, result.product]);
      setNewProduct({ name: '', description: '', price: '', imageUrl: '', inventory: '' });
      setMessage(result.message);
      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
    } catch (productError) {
      setError(productError.message || 'Could not add the product.');
    } finally {
      setAddingProduct(false);
    }
  };

  const updateNewProduct = (event) => {
    const { name, value } = event.target;
    setNewProduct((current) => ({ ...current, [name]: value }));
  };

  const updateProduct = async (product) => {
    setSavingProductId(product.id);
    setError('');
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...product, price: Number(product.price), inventory: Number(product.inventory) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setProducts((current) => current.map((item) => item.id === product.id ? result.product : item));
      setCart((current) => current.map((item) => item.id === product.id ? { ...item, ...result.product } : item));
      setEditingProductId(null);
      setMessage(result.message);
    } catch (productError) {
      setError(productError.message || 'Could not update the product.');
    } finally {
      setSavingProductId(null);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    setError('');
    try {
      const response = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setCart((current) => current.filter((item) => item.id !== product.id));
      setMessage(`${product.name} was deleted.`);
    } catch (productError) {
      setError(productError.message || 'Could not delete the product.');
    }
  };

  const updateQuantity = (id, change) => {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: item.quantity + change } : item)
      .filter((item) => item.quantity > 0));
  };

  const removeFromCart = (id) => setCart((current) => current.filter((item) => item.id !== id));

  const checkout = async () => {
    setOrdering(true);
    setError('');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setMessage(`Order #${result.orderId} placed.`);
      setCart([]);
      setCartOpen(false);
      setPurchaseModalOpen(true);
      const refreshedProducts = await fetch('/api/products').then((productResponse) => productResponse.json());
      setProducts(refreshedProducts);
    } catch (checkoutError) {
      setError(checkoutError.message || 'Checkout failed.');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Campus Cart home">
          <span className="brand-mark"><ShoppingBag size={19} /></span>
          <span>campus<span>cart</span></span>
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#shop">Shop</a>
          <a href="#about">About</a>
          <a href="#sell">Sell</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="header-meta">Local finds for busy minds <span className="dot" /></div>
        <button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`Open cart with ${cartCount} items`}>
          <ShoppingBag size={18} />
          <span>Cart</span>
          <strong>{cartCount}</strong>
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={15} /> The student essentials edit</p>
            <h1>Good things<br /><em>for the long haul.</em></h1>
            <p className="hero-text">Thoughtful gear for bright mornings, packed schedules, and all the in-between hours on campus.</p>
            <a className="browse-link" href="#shop">Browse the collection <ArrowRight size={17} /></a>
          </div>
          <div className="hero-art" aria-label="A curated arrangement of campus essentials">
            <div className="sun-disc" />
            <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85" alt="Students walking across campus" />
            <span className="art-label">Made for<br />campus days</span>
          </div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading">
            <div><p className="eyebrow">01 / Shop</p><h2>Small upgrades,<br /><span>real difference.</span></h2></div>
            <p className="section-note">A considered collection of useful things. Select an item to add it to your cart.</p>
          </div>
          {message && <div className="notice success">{message}</div>}
          {error && <div className="notice error">{error}</div>}
          {loading && <div className="loading">Loading the collection...</div>}
          {!loading && !error && <div className="product-grid">
            {products.map((product, index) => <ProductCard key={product.id} product={product} index={index} onAdd={addToCart} editing={editingProductId === product.id} saving={savingProductId === product.id} onEdit={() => setEditingProductId(product.id)} onCancelEdit={() => setEditingProductId(null)} onSave={updateProduct} onDelete={deleteProduct} />)}
          </div>}
        </section>

        <section className="about-section" id="about">
          <div><p className="eyebrow">02 / About campus cart</p><h2>Useful things,<br /><em>close to home.</em></h2></div>
          <p>Campus Cart is a small student-first store for the essentials that make everyday college life a little easier. Everything is selected with busy schedules, shared spaces, and real student budgets in mind.</p>
        </section>

        <section className="sell-section" id="sell">
          <div className="sell-heading"><p className="eyebrow">03 / Add a product</p><h2>Share something<br /><em>worth carrying.</em></h2><p>Add a useful campus item to the collection. It will be saved to SQL Server and appear in the shop immediately.</p><button className="submit-product" type="button" onClick={() => setProductModalOpen(true)}>Add new product <Plus size={17} /></button></div>
          <div className="sell-preview"><ShoppingBag size={30} /><p>Have something useful for campus life?</p><span>List it in the collection and keep the shop growing.</span></div>
        </section>

        {productModalOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setProductModalOpen(false)}><div className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
          <div className="modal-header"><div><p className="eyebrow">New listing</p><h2 id="product-modal-title">Add a product</h2></div><button className="icon-button" onClick={() => setProductModalOpen(false)} aria-label="Close add product dialog"><X size={20} /></button></div>
          <form className="product-form" onSubmit={submitProduct}>
            <label>Product name<input name="name" value={newProduct.name} onChange={updateNewProduct} placeholder="e.g. Study Planner" required maxLength="120" /></label>
            <label>Description<textarea name="description" value={newProduct.description} onChange={updateNewProduct} placeholder="What makes it useful?" required maxLength="500" rows="3" /></label>
            <div className="form-row"><label>Price<input name="price" value={newProduct.price} onChange={updateNewProduct} type="number" min="0" step="0.01" placeholder="0.00" required /></label><label>Inventory<input name="inventory" value={newProduct.inventory} onChange={updateNewProduct} type="number" min="0" step="1" placeholder="0" required /></label></div>
            <label>Image URL<input name="imageUrl" value={newProduct.imageUrl} onChange={updateNewProduct} type="url" placeholder="https://..." required maxLength="500" /></label>
            <button className="submit-product" type="submit" disabled={addingProduct}>{addingProduct ? 'Adding product...' : 'Add product'} <Plus size={17} /></button>
          </form>
        </div></div>}
      </main>

      <footer className="site-footer" id="contact">
        <div className="footer-top">
          <div className="footer-brand"><a className="brand" href="/" aria-label="Campus Cart home"><span className="brand-mark"><ShoppingBag size={19} /></span><span>campus<span>cart</span></span></a><p>Good things for the long haul.</p></div>
          <div className="footer-column"><p className="footer-label">Visit us</p><address><MapPin size={16} /> Student Commons<br />North Campus, Building 4<br />Pune, Maharashtra 411007</address></div>
          <div className="footer-column"><p className="footer-label">Get in touch</p><a href="mailto:hello@campuscart.example"><Mail size={16} /> hello@campuscart.example</a><a href="tel:+912012345678"><Phone size={16} /> +91 20 1234 5678</a></div>
          <div className="footer-column"><p className="footer-label">Hours</p><p>Mon - Fri<br />9:00 AM - 6:00 PM</p><p>Sat - Sun<br />10:00 AM - 4:00 PM</p></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Campus Cart</span><span>Made for campus days</span></div>
      </footer>

      {cartOpen && <CartDrawer cart={cart} total={cartTotal} ordering={ordering} onClose={() => setCartOpen(false)} onUpdate={updateQuantity} onRemove={removeFromCart} onCheckout={checkout} />}
      {purchaseModalOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPurchaseModalOpen(false)}><div className="purchase-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-modal-title"><div className="success-mark">✓</div><p className="eyebrow">Order confirmed</p><h2 id="purchase-modal-title">Thank you for shopping!</h2><p>Your shopping was successful. Your order has been placed.</p><button className="submit-product" onClick={() => setPurchaseModalOpen(false)}>Continue shopping <ArrowRight size={17} /></button></div></div>}
    </div>
  );
}

function ProductCard({ product, index, onAdd, editing, saving, onEdit, onCancelEdit, onSave, onDelete }) {
  const soldOut = product.inventory === 0;
  const [draft, setDraft] = useState(product);

  useEffect(() => setDraft(product), [product]);

  if (editing) return <article className="product-card edit-card" style={{ '--delay': `${index * 70}ms` }}>
    <div className="edit-card-heading"><span>Editing product</span><button className="icon-button" onClick={onCancelEdit} aria-label={`Cancel editing ${product.name}`}><X size={17} /></button></div>
    <label>Product name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength="120" /></label>
    <label>Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength="500" rows="3" /></label>
    <div className="form-row"><label>Price<input type="number" min="0" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></label><label>Inventory<input type="number" min="0" step="1" value={draft.inventory} onChange={(event) => setDraft({ ...draft, inventory: event.target.value })} /></label></div>
    <label>Image URL<input value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} maxLength="500" /></label>
    <button className="submit-product" disabled={saving} onClick={() => onSave(draft)}>{saving ? 'Saving...' : 'Save changes'} <ArrowRight size={16} /></button>
  </article>;

  return <article className="product-card" style={{ '--delay': `${index * 70}ms` }}>
    <div className="product-image-wrap"><img src={product.imageUrl} alt={product.name} /><span className="stock-label">{soldOut ? 'Sold out' : `${product.inventory} available`}</span></div>
    <div className="product-info"><div><h3>{product.name}</h3><p>{product.description}</p></div><span className="price">{money.format(product.price)}</span></div>
    <div className="product-actions"><button className="add-button" disabled={soldOut} onClick={() => onAdd(product)}>{soldOut ? 'Sold out' : 'Add to cart'} <Plus size={17} /></button><button className="manage-button" onClick={onEdit}><Edit3 size={14} /> Edit</button><button className="manage-button danger" onClick={() => onDelete(product)}><Trash2 size={14} /> Delete</button></div>
  </article>;
}

function CartDrawer({ cart, total, ordering, onClose, onUpdate, onRemove, onCheckout }) {
  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="cart-drawer" aria-label="Shopping cart">
      <div className="drawer-header"><div><p className="eyebrow">Your selection</p><h2>Cart</h2></div><button className="icon-button" onClick={onClose} aria-label="Close cart"><X size={20} /></button></div>
      {cart.length === 0 ? <div className="empty-cart"><ShoppingBag size={32} /><p>Your cart is waiting for something useful.</p><button className="browse-link" onClick={onClose}>Keep browsing <ArrowRight size={16} /></button></div> : <>
        <div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><img src={item.imageUrl} alt="" /><div className="cart-item-main"><h3>{item.name}</h3><span>{money.format(item.price)}</span><div className="quantity"><button onClick={() => onUpdate(item.id, -1)} aria-label={`Decrease ${item.name} quantity`}><Minus size={13} /></button><b>{item.quantity}</b><button disabled={item.quantity >= item.inventory} onClick={() => onUpdate(item.id, 1)} aria-label={`Increase ${item.name} quantity`}><Plus size={13} /></button></div></div><button className="remove-button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}><Trash2 size={16} /></button></div>)}</div>
        <div className="cart-summary"><div><span>Subtotal</span><strong>{money.format(total)}</strong></div><p>Taxes and campus delivery are included for this demo.</p><button className="checkout-button" disabled={ordering} onClick={onCheckout}>{ordering ? 'Placing order...' : 'Buy now'} <ArrowRight size={18} /></button></div>
      </>}
    </aside>
  </div>;
}

export default App;
