
import React, { useState, useMemo } from 'react';

const initialProducts = [
  {id:1,name:'iPhone 15',category:'هواتف',price:6500,description:'هاتف Apple بحالة ممتازة',emoji:'📱'},
  {id:2,name:'Samsung Galaxy',category:'هواتف',price:3200,description:'هاتف Samsung',emoji:'📱'},
  {id:3,name:'AirPods',category:'سماعات',price:450,description:'سماعات لاسلكية',emoji:'🎧'},
  {id:4,name:'Chargeur USB-C',category:'شواحن',price:120,description:'شاحن سريع',emoji:'🔌'},
  {id:5,name:'Coque Protection',category:'حماية',price:70,description:'حماية للهاتف',emoji:'🛡️'},
  {id:6,name:'Cable USB-C',category:'إكسسوارات',price:50,description:'كابل شحن',emoji:'🔋'}
];

const money = n => Number(n).toLocaleString('fr-MA')+' DH';

export default function App() {
  const [products,setProducts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rm_products')) || initialProducts; }
    catch { return initialProducts; }
  });
  const [cart,setCart] = useState([]);
  const [category,setCategory] = useState('الكل');
  const [search,setSearch] = useState('');
  const [page,setPage] = useState('shop');
  const [admin,setAdmin] = useState(false);
  const [login,setLogin] = useState({id:'',code:''});
  const [customer,setCustomer] = useState({name:'',phone:'',address:''});
  const [message,setMessage] = useState('');
  const [newProduct,setNewProduct] = useState({
    name:'',category:'هواتف',price:'',description:''
  });

  const filtered = useMemo(() => products.filter(p =>
    (category==='الكل' || p.category===category) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  ),[products,category,search]);

  const total = cart.reduce((s,p)=>s+p.price*p.qty,0);
  const categories = ['الكل','هواتف','إكسسوارات','شواحن','سماعات','حماية','أخرى'];

  function saveProducts(data) {
    setProducts(data);
    localStorage.setItem('rm_products',JSON.stringify(data));
  }

  function addToCart(product) {
    setCart(old => {
      const found=old.find(p=>p.id===product.id);
      return found
        ? old.map(p=>p.id===product.id?{...p,qty:p.qty+1}:p)
        : [...old,{...product,qty:1}];
    });
    setMessage('تمت إضافة المنتج إلى السلة');
  }

  function removeFromCart(id) {
    setCart(old=>old.filter(p=>p.id!==id));
  }

  function submitOrder(e) {
    e.preventDefault();
    if(!customer.name || !customer.phone || !customer.address || !cart.length) return;
    const order={
      id:'RM-'+Date.now(),
      customer,
      products:cart,
      total,
      date:new Date().toLocaleString('fr-MA'),
      status:'جديد'
    };
    const old=JSON.parse(localStorage.getItem('rm_orders')||'[]');
    localStorage.setItem('rm_orders',JSON.stringify([order,...old]));
    setCart([]);
    setCustomer({name:'',phone:'',address:''});
    setMessage('تم تسجيل الطلب على هذا الجهاز بنجاح');
    setPage('shop');
  }

  function loginAdmin(e) {
    e.preventDefault();
    setMessage('لم يتم إعداد حساب الإدارة بعد. سنربطه بقاعدة البيانات الآمنة.');
  }

  function addProduct(e) {
    e.preventDefault();
    if(!newProduct.name || !newProduct.price) return;
    saveProducts([...products,{
      ...newProduct,
      id:Date.now(),
      price:Number(newProduct.price),
      emoji:'📱'
    }]);
    setNewProduct({name:'',category:'هواتف',price:'',description:''});
    setMessage('تمت إضافة المنتج');
  }

  function deleteProduct(id) {
    if(window.confirm('هل تريد حذف هذا المنتج؟')) {
      saveProducts(products.filter(p=>p.id!==id));
    }
  }

  const orders = JSON.parse(localStorage.getItem('rm_orders')||'[]');

  return (
    <div className="app" dir="rtl">
      <header className="header">
        <div className="brand">
          <div className="logo">RM</div>
          <div><h1>RM-PHONE</h1><small>Votre Phone Store</small></div>
        </div>
        <nav>
          <button onClick={()=>setPage('shop')}>الرئيسية</button>
          <button onClick={()=>setPage('cart')}>السلة ({cart.reduce((s,p)=>s+p.qty,0)})</button>
          <button onClick={()=>setPage('login')}>الإدارة</button>
        </nav>
      </header>

      <section className="hero">
        <span>WELCOME TO RM-PHONE</span>
        <h2>كل ما تحتاجه لهاتفك في مكان واحد</h2>
        <p>هواتف • إكسسوارات • شواحن • سماعات</p>
        <button onClick={()=>setPage('shop')}>اكتشف المنتجات</button>
      </section>

      {message && (
        <div className="notice">
          {message}
          <button onClick={()=>setMessage('')}>×</button>
        </div>
      )}

      {page==='shop' && (
        <main className="content">
          <h2>منتجاتنا</h2>
          <input
            placeholder="ابحث عن منتج..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
          <div className="categories">
            {categories.map(c=>(
              <button className={category===c?'active':''}
                key={c} onClick={()=>setCategory(c)}>{c}</button>
            ))}
          </div>
          <div className="products">
            {filtered.map(p=>(
              <article className="product" key={p.id}>
                <div className="product-image">{p.emoji}</div>
                <span className="tag">{p.category}</span>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <strong>{money(p.price)}</strong>
                <button onClick={()=>addToCart(p)}>أضف إلى السلة</button>
              </article>
            ))}
            {!filtered.length && <p>لا توجد منتجات مطابقة.</p>}
          </div>
        </main>
      )}

      {page==='cart' && (
        <main className="content">
          <h2>سلة المشتريات</h2>
          {!cart.length && <p>السلة فارغة حالياً.</p>}
          {cart.map(p=>(
            <div className="cart-item" key={p.id}>
              <span>{p.name} × {p.qty}</span>
              <strong>{money(p.price*p.qty)}</strong>
              <button onClick={()=>removeFromCart(p.id)}>حذف</button>
            </div>
          ))}
          <h3>المجموع: {money(total)}</h3>
          {!!cart.length && (
            <form onSubmit={submitOrder} className="order-form">
              <h3>معلومات التوصيل</h3>
              <input required placeholder="الاسم الكامل"
                value={customer.name}
                onChange={e=>setCustomer({...customer,name:e.target.value})}/>
              <input required type="tel" placeholder="رقم الهاتف"
                value={customer.phone}
                onChange={e=>setCustomer({...customer,phone:e.target.value})}/>
              <textarea required placeholder="العنوان بالتفصيل"
                value={customer.address}
                onChange={e=>setCustomer({...customer,address:e.target.value})}/>
              <button type="submit">تأكيد الطلب</button>
            </form>
          )}
        </main>
      )}

      {page==='login' && (
        <main className="content">
          <h2>دخول الإدارة</h2>
          <form className="order-form" onSubmit={loginAdmin}>
            <input placeholder="Admin ID" value={login.id}
              onChange={e=>setLogin({...login,id:e.target.value})}/>
            <input type="password" placeholder="Admin Code"
              value={login.code}
              onChange={e=>setLogin({...login,code:e.target.value})}/>
            <button type="submit">دخول</button>
          </form>
          <p>سيتم تفعيل الدخول الآمن بعد إعداد قاعدة البيانات.</p>
        </main>
      )}

      {page==='admin' && admin && (
        <main className="content">
          <h2>لوحة الإدارة</h2>
          <h3>إضافة منتج</h3>
          <form className="order-form" onSubmit={addProduct}>
            <input placeholder="اسم المنتج" required value={newProduct.name}
              onChange={e=>setNewProduct({...newProduct,name:e.target.value})}/>
            <select value={newProduct.category}
              onChange={e=>setNewProduct({...newProduct,category:e.target.value})}>
              {categories.slice(1).map(c=><option key={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="الثمن بالدرهم" required
              value={newProduct.price}
              onChange={e=>setNewProduct({...newProduct,price:e.target.value})}/>
            <input placeholder="الوصف" value={newProduct.description}
              onChange={e=>setNewProduct({...newProduct,description:e.target.value})}/>
            <button>إضافة المنتج</button>
          </form>
          <h3>المنتجات</h3>
          {products.map(p=>(
            <div className="cart-item" key={p.id}>
              {p.name} - {money(p.price)}
              <button onClick={()=>deleteProduct(p.id)}>حذف</button>
            </div>
          ))}
          <h3>الطلبات ({orders.length})</h3>
          {orders.map(o=>(
            <div className="product" key={o.id}>
              <strong>{o.id}</strong>
              <p>{o.customer.name} - {o.customer.phone}</p>
              <p>{o.customer.address}</p>
              <strong>{money(o.total)}</strong>
            </div>
          ))}
        </main>
      )}

      <footer>
        <h2>RM-PHONE</h2>
        <p>شكراً لثقتكم بنا ❤️</p>
        <small>© 2026 RM-PHONE</small>
      </footer>
    </div>
  );
}
