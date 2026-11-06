import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import './style.css';

const money = n => `${Number(n || 0).toLocaleString('fr-MA')} DH`;

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState('الكل');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState('shop');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [customer, setCustomer] = useState({
    name: '', phone: '', address: ''
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [admin, setAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);

  const [productForm, setProductForm] = useState({
    name: '', category: 'هواتف', price: '',
    description: '', image_url: ''
  });

  const categories = [
    'الكل', 'هواتف', 'إكسسوارات',
    'شواحن', 'سماعات', 'حماية', 'أخرى'
  ];

  async function loadProducts(isAdmin = false) {
    let query = supabase.from('products').select('*');
    if (!isAdmin) query = query.eq('active', true);

    const { data, error } = await query.order('created_at', {
      ascending: false
    });

    if (error) {
      setMessage('خطأ في تحميل المنتجات: ' + error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  async function checkAdmin(currentUser) {
    if (!currentUser) {
      setAdmin(false);
      setUser(null);
      return;
    }

    setUser(currentUser);

    const { data, error } = await supabase.rpc('is_admin');

    if (!error && data === true) {
      setAdmin(true);
      await loadProducts(true);
      await loadOrders();
    } else {
      setAdmin(false);
    }
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage('تعذر تحميل الطلبات: ' + error.message);
    } else {
      setOrders(data || []);
    }
  }

  useEffect(() => {
    loadProducts();

    supabase.auth.getSession().then(({ data }) => {
      checkAdmin(data.session?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        checkAdmin(session?.user || null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory =
        category === 'الكل' || p.category === category;
      const matchesSearch =
        (p.name || '').toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [products, category, search]);

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity, 0
  );

  function addToCart(product) {
    setCart(old => {
      const found = old.find(item => item.id === product.id);
      if (found) {
        return old.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...old, { ...product, quantity: 1 }];
    });
    setMessage('تزاد المنتج للسلة');
  }

  function changeQuantity(id, amount) {
    setCart(old =>
      old
        .map(item =>
          item.id === id
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  }

  async function submitOrder(e) {
    e.preventDefault();

    if (!cart.length) {
      setMessage('السلة فارغة');
      return;
    }

    const { error } = await supabase.from('orders').insert([{
      customer_name: customer.name,
      phone: customer.phone,
      address: customer.address,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      total,
      status: 'new'
    }]);

    if (error) {
      setMessage('ما تسجلش الطلب: ' + error.message);
      return;
    }

    setCart([]);
    setCustomer({ name: '', phone: '', address: '' });
    setPage('shop');
    setMessage('تم إرسال الطلب بنجاح، شكراً لك!');
  }

  async function login(e) {
    e.preventDefault();
    setMessage('جاري تسجيل الدخول...');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage('معلومات الدخول غير صحيحة: ' + error.message);
      return;
    }

    const { data: allowed, error: adminError } =
      await supabase.rpc('is_admin');

    if (adminError || allowed !== true) {
      await supabase.auth.signOut();
      setMessage('هاد الحساب ما عندوش صلاحية الإدارة');
      return;
    }

    setUser(data.user);
    setAdmin(true);
    setPage('admin');
    await loadProducts(true);
    await loadOrders();
    setMessage('مرحبا بك في لوحة الإدارة');
  }

  async function logout() {
    await supabase.auth.signOut();
    setAdmin(false);
    setUser(null);
    setPage('shop');
    await loadProducts(false);
    setMessage('تم تسجيل الخروج');
  }

  async function saveProduct(e) {
    e.preventDefault();

    const product = {
      name: productForm.name,
      category: productForm.category,
      price: Number(productForm.price),
      description: productForm.description,
      image_url: productForm.image_url,
      active: true
    };

    const { error } = await supabase.from('products').insert([product]);

    if (error) {
      setMessage('تعذر إضافة المنتج: ' + error.message);
      return;
    }

    setProductForm({
      name: '', category: 'هواتف', price: '',
      description: '', image_url: ''
    });

    await loadProducts(true);
    setMessage('تمت إضافة المنتج');
  }

  async function deleteProduct(id) {
    if (!window.confirm('واش متأكد بغيتي تحذف هاد المنتج؟')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage('تعذر حذف المنتج: ' + error.message);
      return;
    }

    await loadProducts(true);
    setMessage('تم حذف المنتج');
  }

  async function updateOrder(id, status) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (error) {
      setMessage('تعذر تحديث الطلب: ' + error.message);
      return;
    }

    await loadOrders();
    setMessage('تم تحديث حالة الطلب');
  }

  async function deleteOrder(id) {
    if (!window.confirm('واش متأكد بغيتي تحذف الطلب؟')) return;

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage('تعذر حذف الطلب: ' + error.message);
      return;
    }

    await loadOrders();
    setMessage('تم حذف الطلب');
  }

  return (
    <div dir="rtl" className="store">
      <header className="header">
        <div>
          <h1>RM-PHONE</h1>
          <p>متجرك للهواتف والإكسسوارات</p>
        </div>

        <nav>
          <button onClick={() => setPage('shop')}>الرئيسية</button>
          <button onClick={() => setPage('cart')}>
            السلة ({cart.reduce((s, i) => s + i.quantity, 0)})
          </button>
          <button onClick={() => setPage('login')}>الإدارة</button>
        </nav>
      </header>

      {message && (
        <div className="message">
          {message}
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      {page === 'shop' && (
        <main>
          <section className="hero">
            <h2>مرحبا بكم في RM-PHONE</h2>
            <p>اكتشف أحدث الهواتف والإكسسوارات</p>
          </section>

          <input
            className="search"
            placeholder="قلب على منتج..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="categories">
            {categories.map(c => (
              <button
                key={c}
                className={category === c ? 'selected' : ''}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <p>جاري تحميل المنتجات...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="empty">ما كاين حتى منتج دابا.</p>
          ) : (
            <div className="products">
              {filteredProducts.map(p => (
                <article className="product" key={p.id}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} />
                  ) : (
                    <div className="no-image">RM-PHONE</div>
                  )}
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <strong>{money(p.price)}</strong>
                  <button onClick={() => addToCart(p)}>
                    زيد للسلة
                  </button>
                </article>
              ))}
            </div>
          )}
        </main>
      )}

      {page === 'cart' && (
        <main className="panel">
          <h2>سلة المشتريات</h2>

          {cart.length === 0 ? (
            <p>السلة فارغة</p>
          ) : (
            <>
              {cart.map(item => (
                <div className="cart-item" key={item.id}>
                  <div>
                    <b>{item.name}</b>
                    <p>{money(item.price)}</p>
                  </div>
                  <div>
                    <button onClick={() => changeQuantity(item.id, -1)}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => changeQuantity(item.id, 1)}>
                      +
                    </button>
                  </div>
                </div>
              ))}

              <h3>المجموع: {money(total)}</h3>

              <form onSubmit={submitOrder} className="form">
                <h3>معلومات التوصيل</h3>
                <input
                  required
                  placeholder="الاسم الكامل"
                  value={customer.name}
                  onChange={e =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                />
                <input
                  required
                  type="tel"
                  placeholder="رقم الهاتف"
                  value={customer.phone}
                  onChange={e =>
                    setCustomer({ ...customer, phone: e.target.value })
                  }
                />
                <textarea
                  required
                  placeholder="العنوان بالتفصيل"
                  value={customer.address}
                  onChange={e =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                />
                <button type="submit">أكد الطلب</button>
              </form>
            </>
          )}
        </main>
      )}

      {page === 'login' && (
        <main className="panel">
          <h2>دخول الإدارة</h2>
          <form className="form" onSubmit={login}>
            <input
              required
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              required
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button type="submit">دخول</button>
          </form>
        </main>
      )}

      {page === 'admin' && admin && (
        <main className="panel">
          <div className="admin-title">
            <h2>لوحة إدارة RM-PHONE</h2>
            <button onClick={logout}>خروج</button>
          </div>

          <h3>إضافة منتج جديد</h3>
          <form className="form" onSubmit={saveProduct}>
            <input
              required
              placeholder="اسم المنتج"
              value={productForm.name}
              onChange={e =>
                setProductForm({ ...productForm, name: e.target.value })
              }
            />
            <select
              value={productForm.category}
              onChange={e =>
                setProductForm({ ...productForm, category: e.target.value })
              }
            >
              {categories.filter(c => c !== 'الكل').map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              required
              type="number"
              min="0"
              placeholder="الثمن بالدرهم"
              value={productForm.price}
              onChange={e =>
                setProductForm({ ...productForm, price: e.target.value })
              }
            />
            <textarea
              placeholder="وصف المنتج"
              value={productForm.description}
              onChange={e =>
                setProductForm({
                  ...productForm, description: e.target.value
                })
              }
            />
            <input
              placeholder="رابط صورة المنتج"
              value={productForm.image_url}
              onChange={e =>
                setProductForm({
                  ...productForm, image_url: e.target.value
                })
              }
            />
            <button type="submit">أضف المنتج</button>
          </form>

          <h3>المنتجات ({products.length})</h3>
          {products.map(p => (
            <div className="admin-item" key={p.id}>
              <span>{p.name} — {money(p.price)}</span>
              <button onClick={() => deleteProduct(p.id)}>حذف</button>
            </div>
          ))}

          <h3>الطلبات ({orders.length})</h3>
          {orders.length === 0 && <p>ما كايناش طلبات دابا.</p>}

          {orders.map(order => (
            <article className="order" key={order.id}>
              <h4>الطلب: {order.id}</h4>
              <p>الاسم: {order.customer_name}</p>
              <p>الهاتف: {order.phone}</p>
              <p>العنوان: {order.address}</p>
              <p>المجموع: {money(order.total)}</p>
              <p>الحالة: {order.status}</p>

              <ul>
                {(Array.isArray(order.items) ? order.items : []).map(
                  (item, i) => (
                    <li key={i}>
                      {item.name} × {item.quantity}
                    </li>
                  )
                )}
              </ul>

              <select
                value={order.status || 'new'}
                onChange={e => updateOrder(order.id, e.target.value)}
              >
                <option value="new">جديد</option>
                <option value="accepted">مقبول</option>
                <option value="rejected">مرفوض</option>
                <option value="cancelled">ملغي</option>
                <option value="completed">مكتمل</option>
              </select>

              <button onClick={() => deleteOrder(order.id)}>
                حذف الطلب
              </button>
            </article>
          ))}
        </main>
      )}

      <footer>
        <p>© RM-PHONE - جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}