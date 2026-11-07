import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import './style.css';

const money = n => `${Number(n || 0).toLocaleString('fr-MA')} DH`;

const CONTACTS = [
  { name: 'MOUAD', phone: '+212 6 10 58 87 59', digits: '212610588759' },
  { name: 'RIDA', phone: '+212 6 18 32 44 90', digits: '212618324490' }
];
const INSTAGRAM_URL = 'https://www.instagram.com/rmphon.e/';

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState('الكل');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState('shop');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [customer, setCustomer] = useState({
    name: '', phone: '', city: '', address: ''
  });

  const [repair, setRepair] = useState({
    name: '', phone: '', device: '', problem: '', address: ''
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
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
      city: customer.city,
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
    setCustomer({ name: '', phone: '', city: '', address: '' });
    setPage('shop');
    setMessage('تم إرسال الطلب بنجاح، شكراً لك!');
  }

  function sendRepairRequest(e) {
    e.preventDefault();

    const text = [
      'طلب إصلاح هاتف في المنزل - RM-PHONE',
      `الاسم: ${repair.name}`,
      `الهاتف: ${repair.phone}`,
      `نوع الهاتف: ${repair.device}`,
      `العطل: ${repair.problem}`,
      'المدينة: طنجة',
      `العنوان: ${repair.address}`
    ].join('\n');

    const url = `https://wa.me/${CONTACTS[0].digits}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setMessage('اختار إرسال الرسالة من WhatsApp باش يوصلنا طلبك.');
  }
    async function loginAdmin(e) {
    e.preventDefault();
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage('معلومات الدخول غير صحيحة: ' + error.message);
    } else {
      setPassword('');
      setMessage('تم تسجيل الدخول');
    }
  }

  async function logoutAdmin() {
    await supabase.auth.signOut();
    setAdmin(false);
    setUser(null);
    setPage('shop');
    setMessage('تم تسجيل الخروج');
  }

  async function saveProduct(e) {
    e.preventDefault();
    setMessage('');

    if (!productForm.name || !productForm.price) {
      setMessage('دخل اسم المنتج والثمن');
      return;
    }

    setUploadingImage(true);

    try {
      let imageUrl = productForm.image_url;

      if (imageFile) {
        const extension = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36).slice(2)}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('products')
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from('products').insert([{
        name: productForm.name,
        category: productForm.category,
        price: Number(productForm.price),
        description: productForm.description,
        image_url: imageUrl,
        active: true
      }]);

      if (error) throw error;

      setProductForm({
        name: '', category: 'هواتف', price: '',
        description: '', image_url: ''
      });
      setImageFile(null);
      await loadProducts(true);
      setMessage('تمت إضافة المنتج بنجاح');
    } catch (error) {
      setMessage('وقع خطأ: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  }

  async function toggleProduct(product) {
    const { error } = await supabase
      .from('products')
      .update({ active: !product.active })
      .eq('id', product.id);

    if (error) {
      setMessage('تعذر تغيير حالة المنتج: ' + error.message);
    } else {
      await loadProducts(true);
      setMessage('تم تحديث المنتج');
    }
  }

  async function updateOrderStatus(order, status) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', order.id);

    if (error) {
      setMessage('تعذر تحديث الطلب: ' + error.message);
    } else {
      await loadOrders();
      setMessage('تم تحديث حالة الطلب');
    }
  }

  function openWhatsApp(phone, text) {
    const digits = phone.replace(/\D/g, '');
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function contactPage() {
    return (
      <section className="page-section">
        <h2>تواصل معنا</h2>
        <p>RM-PHONE دائماً قريب ليك.</p>

        {CONTACTS.map(person => (
          <div className="contact-card" key={person.name}>
            <h3>{person.name}</h3>
            <p dir="ltr">{person.phone}</p>
            <a href={`tel:${person.phone}`}>اتصال</a>
            {' '}
            <button
              type="button"
              onClick={() => openWhatsApp(
                person.digits,
                'السلام عليكم، بغيت نتواصل مع RM-PHONE'
              )}
            >
              WhatsApp
            </button>
          </div>
        ))}

        <div className="contact-card">
          <h3>Instagram</h3>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
            @rmphon.e
          </a>
        </div>

        <div className="contact-card">
          <h3>التبليغ عن مشكل</h3>
          <button
            type="button"
            onClick={() => openWhatsApp(
              CONTACTS[0].digits,
              'السلام عليكم، عندي مشكل في موقع RM-PHONE: '
            )}
          >
            راسلنا للإبلاغ عن مشكل
          </button>
        </div>
      </section>
    );
  }

  function repairPage() {
    return (
      <section className="page-section">
        <h2>إصلاح الهاتف في منزلك</h2>
        <p>الخدمة متوفرة داخل مدينة طنجة فقط.</p>

        <form onSubmit={sendRepairRequest} className="main-form">
          <label>الاسم الكامل</label>
          <input
            required
            value={repair.name}
            onChange={e => setRepair({
              ...repair, name: e.target.value
            })}
            placeholder="الاسم الكامل"
          />

          <label>رقم الهاتف</label>
          <input
            required
            type="tel"
            value={repair.phone}
            onChange={e => setRepair({
              ...repair, phone: e.target.value
            })}
            placeholder="رقم الهاتف"
          />

          <label>نوع الهاتف</label>
          <input
            required
            value={repair.device}
            onChange={e => setRepair({
              ...repair, device: e.target.value
            })}
            placeholder="مثلاً iPhone 13"
          />

          <label>شنو هو العطل؟</label>
          <textarea
            required
            value={repair.problem}
            onChange={e => setRepair({
              ...repair, problem: e.target.value
            })}
            placeholder="شرح لينا المشكل"
          />

          <label>العنوان داخل طنجة</label>
          <input
            required
            value={repair.address}
            onChange={e => setRepair({
              ...repair, address: e.target.value
            })}
            placeholder="الحي والشارع"
          />

          <button type="submit">إرسال طلب الإصلاح عبر WhatsApp</button>
        </form>
      </section>
    );
  }
    function shopPage() {
    return (
      <section className="page-section">
        <h2>منتجاتنا</h2>

        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="قلب على منتج..."
        />

        <div className="category-list">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              className={category === cat ? 'active' : ''}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p>جاري تحميل المنتجات...</p>
        ) : filteredProducts.length === 0 ? (
          <p>ما كاين حتى منتج حالياً.</p>
        ) : (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <article className="product-card" key={product.id}>
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                  />
                )}
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <strong>{money(product.price)}</strong>
                <button
                  type="button"
                  onClick={() => addToCart(product)}
                >
                  زيد للسلة
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  function cartPage() {
    return (
      <section className="page-section">
        <h2>سلة المشتريات</h2>

        {!cart.length ? (
          <p>السلة فارغة.</p>
        ) : (
          <>
            {cart.map(item => (
              <div className="cart-item" key={item.id}>
                <strong>{item.name}</strong>
                <span>{money(item.price)}</span>
                <button
                  type="button"
                  onClick={() => changeQuantity(item.id, -1)}
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => changeQuantity(item.id, 1)}
                >
                  +
                </button>
              </div>
            ))}

            <h3>المجموع: {money(total)}</h3>

            <form onSubmit={submitOrder} className="main-form">
              <label>الاسم الكامل</label>
              <input
                required
                value={customer.name}
                onChange={e => setCustomer({
                  ...customer, name: e.target.value
                })}
                placeholder="الاسم الكامل"
              />

              <label>رقم الهاتف</label>
              <input
                required
                type="tel"
                value={customer.phone}
                onChange={e => setCustomer({
                  ...customer, phone: e.target.value
                })}
                placeholder="رقم الهاتف"
              />

              <label>المدينة</label>
              <input
                required
                value={customer.city}
                onChange={e => setCustomer({
                  ...customer, city: e.target.value
                })}
                placeholder="المدينة"
              />

              <label>العنوان</label>
              <input
                required
                value={customer.address}
                onChange={e => setCustomer({
                  ...customer, address: e.target.value
                })}
                placeholder="العنوان بالتفصيل"
              />

              <button type="submit">تأكيد الطلب</button>
            </form>
          </>
        )}
      </section>
    );
  }

  function adminPage() {
    if (!admin) {
      return (
        <section className="page-section">
          <h2>دخول الإدارة</h2>
          <form onSubmit={loginAdmin} className="main-form">
            <label>البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="البريد الإلكتروني"
            />

            <label>كلمة المرور</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="كلمة المرور"
            />

            <button type="submit">دخول</button>
          </form>
        </section>
      );
    }

    return (
      <section className="page-section">
        <h2>لوحة الإدارة</h2>
        <button type="button" onClick={logoutAdmin}>
          تسجيل الخروج
        </button>

        <h3>إضافة منتج جديد</h3>
        <form onSubmit={saveProduct} className="main-form">
          <label>اسم المنتج</label>
          <input
            required
            value={productForm.name}
            onChange={e => setProductForm({
              ...productForm, name: e.target.value
            })}
            placeholder="اسم المنتج"
          />

          <label>التصنيف</label>
          <select
            value={productForm.category}
            onChange={e => setProductForm({
              ...productForm, category: e.target.value
            })}
          >
            {categories.filter(c => c !== 'الكل').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <label>الثمن بالدرهم</label>
          <input
            required
            type="number"
            min="0"
            value={productForm.price}
            onChange={e => setProductForm({
              ...productForm, price: e.target.value
            })}
            placeholder="الثمن"
          />

          <label>الوصف</label>
          <textarea
            value={productForm.description}
            onChange={e => setProductForm({
              ...productForm, description: e.target.value
            })}
            placeholder="وصف المنتج"
          />

          <label>صورة المنتج من الهاتف</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setImageFile(
              e.target.files?.[0] || null
            )}
          />

          <label>أو رابط الصورة</label>
          <input
            type="url"
            value={productForm.image_url}
            onChange={e => setProductForm({
              ...productForm, image_url: e.target.value
            })}
            placeholder="رابط الصورة (اختياري)"
          />

          <button type="submit" disabled={uploadingImage}>
            {uploadingImage ? 'جاري الحفظ...' : 'إضافة المنتج'}
          </button>
        </form>

        <h3>المنتجات الحالية</h3>
        {products.map(product => (
          <div className="admin-item" key={product.id}>
            <span>{product.name} — {money(product.price)}</span>
            <button
              type="button"
              onClick={() => toggleProduct(product)}
            >
              {product.active ? 'إخفاء' : 'إظهار'}
            </button>
          </div>
        ))}        <h3>الطلبات الواردة</h3>
        <button type="button" onClick={loadOrders}>
          تحديث الطلبات
        </button>

        {orders.length === 0 ? (
          <p>ما كاين حتى طلب حالياً.</p>
        ) : (
          orders.map(order => (
            <div className="admin-item" key={order.id}>
              <h4>طلب من: {order.customer_name}</h4>
              <p>الهاتف: {order.phone}</p>
              <p>المدينة: {order.city}</p>
              <p>العنوان: {order.address}</p>
              <p>
                المنتجات: {(order.items || []).map(item =>
                  `${item.name} × ${item.quantity}`
                ).join('، ')}
              </p>
              <p>المجموع: {money(order.total)}</p>
              <p>الحالة: {order.status}</p>

              <select
                value={order.status || 'new'}
                onChange={e => updateOrderStatus(order, e.target.value)}
              >
                <option value="new">جديد</option>
                <option value="confirmed">مؤكد</option>
                <option value="processing">قيد المعالجة</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغى</option>
              </select>
            </div>
          ))
        )}
      </section>
    );
  }
    return (
    <div className="app">
      <header className="site-header">
        <h1>RM-PHONE</h1>
        <p>كل ما تحتاجه لهاتفك</p>

        <nav className="main-nav">
          <button onClick={() => setPage('shop')}>الرئيسية</button>
          <button onClick={() => setPage('cart')}>
            السلة ({cart.reduce((s, i) => s + i.quantity, 0)})
          </button>
          <button onClick={() => setPage('repair')}>إصلاح في المنزل</button>
          <button onClick={() => setPage('contact')}>تواصل معنا</button>
          <button onClick={() => setPage('admin')}>الإدارة</button>
        </nav>
      </header>

      {message && (
        <div className="notice">
          {message}
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <main>
        {page === 'shop' && shopPage()}
        {page === 'cart' && cartPage()}
        {page === 'repair' && repairPage()}
        {page === 'contact' && contactPage()}
        {page === 'admin' && adminPage()}
      </main>

      <footer className="site-footer">
        <h3>RM-PHONE</h3>
        <p>طنجة - المغرب</p>
        <p>إصلاح الهواتف وبيع الإكسسوارات</p>
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
          Instagram @rmphon.e
        </a>
      </footer>
    </div>
  );
}