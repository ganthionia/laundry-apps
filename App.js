import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// === Utility helpers ===
const currency = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Number.isFinite(+n) ? +n : 0
  );

const encodeWA = (text) => encodeURIComponent(text);
const todayISO = () => new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

// === Pricing rules (bisa diubah sesuai kebutuhan) ===
const PRICES = {
  basePerKg: 7000,
  expressMultiplier: 1.5,
  ironingPerKg: 3000,
  stainFixFlat: 5000,
  deliveryFlat: 10000,
};

const STATUS_FLOW = [
  "Diterima",
  "Dicuci",
  "Pengeringan",
  "Disetrika",
  "Siap Diambil/Antar",
  "Selesai",
];

const saveOrders = (arr) => localStorage.setItem("laundry_orders", JSON.stringify(arr));
const loadOrders = () => {
  try {
    return JSON.parse(localStorage.getItem("laundry_orders") || "[]");
  } catch {
    return [];
  }
};

function Nav({ active, setActive }) {
  const items = [
    { key: "home", label: "Beranda" },
    { key: "order", label: "Order" },
    { key: "track", label: "Lacak" },
    { key: "admin", label: "Admin" },
  ];
  return (
    <div className="sticky top-0 z-50 backdrop-blur bg-white/80 border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow" />
          <div className="font-semibold text-lg">CleanRush Laundry</div>
        </div>
        <div className="flex gap-1">
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => setActive(it.key)}
              className={`px-3 py-2 rounded-xl text-sm transition ${
                active === it.key ? "bg-blue-600 text-white" : "hover:bg-gray-100"
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ children, title, actions }) {
  return (
    <div className="rounded-2xl border shadow-sm p-5 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">{title}</h3>
        <div className="flex gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}

function Home() {
  const features = [
    { t: "Pickup & Delivery", d: "Penjemputan dan pengantaran terjadwal otomatis." },
    { t: "Kalkulator Harga", d: "Harga transparan berdasarkan berat & layanan." },
    { t: "Pelacakan", d: "Cek status order secara real-time (lokal)." },
    { t: "Notifikasi WA", d: "Kirim ringkasan order via WhatsApp sekali klik." },
  ];
  return (
    <div className="grid md:grid-cols-3 gap-5">
      <Card title="Paket Layanan">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span>Cuci Kering Lipat</span><span>{currency(PRICES.basePerKg)}/kg</span></div>
          <div className="flex justify-between"><span>Express (x{PRICES.expressMultiplier})</span><span>+{Math.round((PRICES.expressMultiplier - 1) * 100)}%</span></div>
          <div className="flex justify-between"><span>Setrika</span><span>{currency(PRICES.ironingPerKg)}/kg</span></div>
          <div className="flex justify-between"><span>Hilangkan Noda</span><span>{currency(PRICES.stainFixFlat)}/order</span></div>
          <div className="flex justify-between"><span>Antar</span><span>{currency(PRICES.deliveryFlat)}/order</span></div>
        </div>
      </Card>
      <Card title="Kenapa Kami?">
        <ul className="list-disc pl-4 text-sm space-y-2">
          {features.map((f) => (
            <li key={f.t}><span className="font-medium">{f.t}:</span> {f.d}</li>
          ))}
        </ul>
      </Card>
      <Card title="Cara Pakai">
        <ol className="list-decimal pl-4 text-sm space-y-2">
          <li>Buka tab <b>Order</b> dan isi form.</li>
          <li>Klik <b>Buat Order</b> untuk mendapatkan kode.</li>
          <li>Kirim ringkasan ke pelanggan via <b>WhatsApp</b>.</li>
          <li>Pelanggan bisa cek status di tab <b>Lacak</b>.</li>
        </ol>
      </Card>
    </div>
  );
}

function Order() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    service: "regular", // regular | express
    kg: 3,
    ironing: false,
    stain: false,
    delivery: true,
    pickupAt: todayISO(),
    note: "",
    payMethod: "cash", // cash | transfer
  });

  const total = useMemo(() => {
    const kg = Number(form.kg) || 0;
    let base = PRICES.basePerKg * kg;
    if (form.service === "express") base *= PRICES.expressMultiplier;
    let add = 0;
    if (form.ironing) add += PRICES.ironingPerKg * kg;
    if (form.stain) add += PRICES.stainFixFlat;
    if (form.delivery) add += PRICES.deliveryFlat;
    return base + add;
  }, [form]);

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const [lastOrder, setLastOrder] = useState(null);

  const createOrder = () => {
    // simple id: CR + yymmdd + random
    const d = new Date();
    const id = `CR${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate()
    ).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const payload = {
      id,
      createdAt: d.toISOString(),
      statusIndex: 0,
      ...form,
      total,
      history: [
        { at: d.toISOString(), status: STATUS_FLOW[0], note: "Order dibuat" },
      ],
    };
    const arr = loadOrders();
    arr.unshift(payload);
    saveOrders(arr);
    setLastOrder(payload);
  };

  const waMsg = useMemo(() => {
    if (!lastOrder) return "";
    const f = lastOrder;
    return (
      `Halo *${f.name}*%0A` +
      `Terima kasih telah order di *CleanRush*.%0A%0A` +
      `Kode: *${f.id}*%0A` +
      `Layanan: ${f.service === "express" ? "Express" : "Regular"}%0A` +
      `Berat: ${f.kg} kg%0A` +
      `${f.ironing ? "+ Setrika%0A" : ""}` +
      `${f.stain ? "+ Hilangkan noda%0A" : ""}` +
      `${f.delivery ? "+ Antar%0A" : ""}` +
      `Jadwal pickup: ${new Date(f.pickupAt).toLocaleString("id-ID")} %0A` +
      `Metode bayar: ${f.payMethod}%0A` +
      `Total: *${currency(f.total)}*%0A%0A` +
      `Lacak status: buka halaman Lacak dan masukkan kode di atas.`
    );
  }, [lastOrder]);

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <Card title="Form Order">
        <div className="grid grid-cols-1 gap-3">
          <div className="grid gap-1">
            <label className="text-sm">Nama</label>
            <input className="input" value={form.name} onChange={(e) => change("name", e.target.value)} placeholder="Nama pelanggan" />
          </div>
          <div className="grid gap-1">
            <label className="text-sm">No. WA/HP</label>
            <input className="input" value={form.phone} onChange={(e) => change("phone", e.target.value)} placeholder="08xxxxxxxxxx" />
          </div>
          <div className="grid gap-1">
            <label className="text-sm">Alamat</label>
            <textarea className="input min-h-[80px]" value={form.address} onChange={(e) => change("address", e.target.value)} placeholder="Alamat lengkap" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className="text-sm">Layanan</label>
              <select className="input" value={form.service} onChange={(e) => change("service", e.target.value)}>
                <option value="regular">Regular</option>
                <option value="express">Express</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-sm">Berat (kg)</label>
              <input type="number" min={1} className="input" value={form.kg} onChange={(e) => change("kg", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ironing} onChange={(e) => change("ironing", e.target.checked)} /> Setrika</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.stain} onChange={(e) => change("stain", e.target.checked)} /> Hilangkan noda</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.delivery} onChange={(e) => change("delivery", e.target.checked)} /> Antar</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className="text-sm">Jadwal Pickup</label>
              <input type="datetime-local" className="input" value={form.pickupAt} onChange={(e) => change("pickupAt", e.target.value)} />
            </div>
            <div className="grid gap-1">
              <label className="text-sm">Metode Bayar</label>
              <select className="input" value={form.payMethod} onChange={(e) => change("payMethod", e.target.value)}>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
          </div>
          <div className="grid gap-1">
            <label className="text-sm">Catatan</label>
            <textarea className="input min-h-[60px]" value={form.note} onChange={(e) => change("note", e.target.value)} placeholder="Opsional" />
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{currency(PRICES.basePerKg)} × {form.kg} kg {form.service === 'express' ? `(x${PRICES.expressMultiplier})` : ''}</span></div>
            <div className="flex justify-between text-sm"><span>Setrika</span><span>{form.ironing ? currency(PRICES.ironingPerKg * (Number(form.kg)||0)) : '-'}</span></div>
            <div className="flex justify-between text-sm"><span>Hilangkan noda</span><span>{form.stain ? currency(PRICES.stainFixFlat) : '-'}</span></div>
            <div className="flex justify-between text-sm"><span>Antar</span><span>{form.delivery ? currency(PRICES.deliveryFlat) : '-'}</span></div>
            <div className="flex justify-between font-semibold mt-2"><span>Total</span><span>{currency(total)}</span></div>
          </div>

          <div className="flex gap-2">
            <button onClick={createOrder} className="btn-primary">Buat Order</button>
            <button onClick={() => setForm({ ...form, name: "", phone: "", address: "", note: "" })} className="btn-ghost">Reset</button>
          </div>
        </div>
      </Card>

      <Card title="Ringkasan & Tindakan" actions={lastOrder && <button className="btn-ghost" onClick={() => window.print()}>Cetak</button>}>
        {!lastOrder ? (
          <div className="text-sm text-gray-500">Belum ada order. Isi form lalu klik <b>Buat Order</b>.</div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Kode</span><span className="font-mono font-semibold">{lastOrder.id}</span></div>
            <div className="flex justify-between"><span>Nama</span><span>{lastOrder.name}</span></div>
            <div className="flex justify-between"><span>Layanan</span><span>{lastOrder.service}</span></div>
            <div className="flex justify-between"><span>Berat</span><span>{lastOrder.kg} kg</span></div>
            <div className="flex justify-between"><span>Pickup</span><span>{new Date(lastOrder.pickupAt).toLocaleString("id-ID")}</span></div>
            <div className="flex justify-between"><span>Total</span><span className="font-semibold">{currency(lastOrder.total)}</span></div>
            <div className="pt-2 flex flex-wrap gap-2">
              <a
                className="btn-primary"
                href={`https://wa.me/${lastOrder.phone.replace(/[^0-9]/g, "")}??text=${waMsg}`}
                target="_blank" rel="noreferrer"
              >
                Kirim ke WhatsApp
              </a>
              <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(lastOrder.id)}>Salin Kode</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Track() {
  const [code, setCode] = useState("");
  const [order, setOrder] = useState(null);

  const find = () => {
    const o = loadOrders().find((x) => x.id.toLowerCase() === code.trim().toLowerCase());
    setOrder(o || null);
  };

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <Card title="Masukkan Kode Order">
        <div className="flex gap-2">
          <input className="input" placeholder="contoh: CR250817-ABCD" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn-primary" onClick={find}>Lacak</button>
        </div>
      </Card>
      <Card title="Status">
        {!order ? (
          <div className="text-sm text-gray-500">Order tidak ditemukan / belum dicari.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span>Kode</span><span className="font-mono">{order.id}</span></div>
            <div className="text-sm">Nama: {order.name}</div>
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_FLOW.map((s, i) => (
                <div key={s} className={`px-3 py-1 rounded-full text-xs border ${i <= order.statusIndex ? "bg-blue-600 text-white" : "bg-gray-50"}`}>{s}</div>
              ))}
            </div>
            <div className="text-sm">
              <div className="font-medium mb-1">Riwayat</div>
              <ul className="text-xs space-y-1 max-h-40 overflow-auto">
                {order.history.map((h, idx) => (
                  <li key={idx} className="flex justify-between"><span>{new Date(h.at).toLocaleString("id-ID")}</span><span>{h.status} – {h.note}</span></li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Admin() {
  const [pin, setPin] = useState("");
  const [ok, setOk] = useState(false);
  const [orders, setOrders] = useState(loadOrders());

  useEffect(() => {
    const i = setInterval(() => setOrders(loadOrders()), 1000);
    return () => clearInterval(i);
  }, []);

  const updateStatus = (id, dir) => {
    const arr = loadOrders();
    const idx = arr.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const cur = arr[idx];
    const next = Math.min(Math.max(cur.statusIndex + dir, 0), STATUS_FLOW.length - 1);
    if (next !== cur.statusIndex) {
      cur.statusIndex = next;
      cur.history.unshift({ at: new Date().toISOString(), status: STATUS_FLOW[next], note: dir > 0 ? "Maju" : "Mundur" });
      arr[idx] = { ...cur };
      saveOrders(arr);
      setOrders(arr);
    }
  };

  const remove = (id) => {
    const arr = loadOrders().filter((x) => x.id !== id);
    saveOrders(arr);
    setOrders(arr);
  };

  if (!ok)
    return (
      <Card title="Login Admin">
        <div className="flex gap-2">
          <input className="input" type="password" placeholder="PIN (default 1234)" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button className="btn-primary" onClick={() => setOk(pin === "1234")}>Masuk</button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Ubah mekanisme login saat migrasi ke backend.</p>
      </Card>
    );

  return (
    <div className="space-y-4">
      <Card title="Manajemen Order" actions={<button className="btn-ghost" onClick={() => { localStorage.removeItem("laundry_orders"); setOrders([]); }}>Reset Semua</button>}>
        {orders.length === 0 ? (
          <div className="text-sm text-gray-500">Belum ada order.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Kode</th>
                  <th>Nama</th>
                  <th>Layanan</th>
                  <th>Kg</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 font-mono">{o.id}</td>
                    <td>{o.name}</td>
                    <td>{o.service}</td>
                    <td>{o.kg}</td>
                    <td>{currency(o.total)}</td>
                    <td>{STATUS_FLOW[o.statusIndex]}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button className="btn-ghost" onClick={() => updateStatus(o.id, -1)}>&lt;</button>
                        <button className="btn-primary" onClick={() => updateStatus(o.id, +1)}>&gt;</button>
                        <button className="btn-danger" onClick={() => remove(o.id)}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("home");

  useEffect(() => {
    // tailwind-esque base styles
    const style = document.createElement("style");
    style.innerHTML = `
      .input { @apply px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/30; }
      .btn-primary { @apply px-3 py-2 rounded-xl bg-blue-600 text-white shadow hover:bg-blue-700 transition; }
      .btn-ghost { @apply px-3 py-2 rounded-xl border hover:bg-gray-50 transition; }
      .btn-danger { @apply px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition; }
      body { @apply bg-gray-50; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="min-h-screen">
      <Nav active={tab} setActive={setTab} />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-semibold">Laundry Otomatis – Mini App</motion.h1>
        <AnimatePresence mode="wait">
          {tab === "home" && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Home />
            </motion.div>
          )}
          {tab === "order" && (
            <motion.div key="order" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Order />
            </motion.div>
          )}
          {tab === "track" && (
            <motion.div key="track" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Track />
            </motion.div>
          )}
          {tab === "admin" && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Admin />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <footer className="py-10 text-center text-xs text-gray-500">© {new Date().getFullYear()} CleanRush Laundry • Demo tanpa backend (data tersimpan di browser).</footer>
    </div>
  );
}
