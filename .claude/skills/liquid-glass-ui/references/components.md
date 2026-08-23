# Liquid Glass — component recipes (React + Tailwind)

All recipes assume the token layer from `tokens.css` is loaded and there's a `.glass-bg` (or image/gradient) behind the UI. Text colors assume dark-ish backgrounds; on light backgrounds swap `text-white` → `text-slate-900`.

## Page background

```jsx
export function GlassPage({ children }) {
  return <div className="glass-bg min-h-screen text-white/90">{children}</div>;
}
```

## Navbar (thick glass, sticky)

```jsx
export function GlassNavbar() {
  return (
    <header className="sticky top-4 z-50 mx-auto max-w-5xl px-4">
      <nav className="glass-thick glass-highlight flex items-center justify-between rounded-full px-6 py-3">
        <span className="text-lg font-semibold tracking-tight">Acme</span>
        <div className="flex items-center gap-1">
          {["Inicio", "Productos", "Docs"].map((item) => (
            <a key={item} href="#"
               className="rounded-full px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white">
              {item}
            </a>
          ))}
          <button className="glass-thin ml-2 rounded-full px-4 py-1.5 text-sm font-medium hover:bg-white/15 active:scale-95">
            Entrar
          </button>
        </div>
      </nav>
    </header>
  );
}
```

## Card

```jsx
export function GlassCard({ title, children }) {
  return (
    <div className="glass glass-highlight rounded-[--glass-radius] p-6 transition hover:scale-[1.02] hover:bg-white/15">
      <h3 className="mb-2 text-base font-semibold">{title}</h3>
      <div className="text-sm text-white/75">{children}</div>
    </div>
  );
}
```

## Modal / Dialog

Backdrop blurs the page; the dialog is the thickest glass on screen.

```jsx
export function GlassModal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true"
           className="glass-thick glass-highlight relative w-full max-w-md rounded-[--glass-radius-lg] p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-3 text-sm text-white/80">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm text-white/70 transition hover:bg-white/10">
            Cancelar
          </button>
          <button className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white active:scale-95">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Sidebar

```jsx
export function GlassSidebar({ items }) {
  return (
    <aside className="glass glass-highlight fixed left-4 top-4 bottom-4 w-60 rounded-[--glass-radius-lg] p-4">
      <nav className="flex flex-col gap-1">
        {items.map(({ label, icon: Icon, active }) => (
          <a key={label} href="#"
             className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition
               ${active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
            {Icon && <Icon size={18} />}
            {label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
```

## Buttons

```jsx
// Primary: solid, sits ON glass — never glass-on-glass for the main CTA
export const GlassButtonPrimary = (p) => (
  <button {...p} className="rounded-full bg-white/90 px-5 py-2.5 text-sm font-semibold text-slate-900
    shadow-lg shadow-black/10 transition hover:bg-white active:scale-95" />
);

// Ghost glass button
export const GlassButton = (p) => (
  <button {...p} className="glass-thin rounded-full px-5 py-2.5 text-sm font-medium
    transition hover:bg-white/15 active:scale-95" />
);
```

## Input

```jsx
export const GlassInput = (p) => (
  <input {...p} className="glass-thin w-full rounded-xl px-4 py-2.5 text-sm placeholder-white/40
    outline-none transition focus:border-white/40 focus:bg-white/10" />
);
```

## Toggle

```jsx
export function GlassToggle({ checked, onChange }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full border border-white/20 transition
        ${checked ? "bg-emerald-400/80" : "bg-white/10"}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform
        ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}
```

## Dock (macOS-style)

```jsx
export function GlassDock({ apps }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="glass-thick glass-highlight flex items-end gap-3 rounded-3xl px-4 py-3">
        {apps.map(({ name, icon: Icon }) => (
          <button key={name} title={name}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10
              transition-transform duration-200 hover:-translate-y-2 hover:scale-110 active:scale-95">
            <Icon size={24} />
          </button>
        ))}
      </div>
    </div>
  );
}
```

## Toast

```jsx
export function GlassToast({ message }) {
  return (
    <div className="glass-thick glass-highlight fixed bottom-6 right-6 z-50 flex items-center gap-3
      rounded-2xl px-4 py-3 text-sm shadow-xl shadow-black/20">
      {message}
    </div>
  );
}
```

## Notes

- `rounded-[--glass-radius]` requires Tailwind arbitrary-value support (v3.2+/v4). Otherwise use `rounded-2xl` / `rounded-3xl`.
- Light theme: wrap the app without `.dark`, use light photo/gradient backgrounds, and switch text to `text-slate-900/90`.
- Icons in examples assume `lucide-react`, but any icon set works.
