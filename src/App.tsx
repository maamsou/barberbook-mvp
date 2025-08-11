
import React, { useMemo, useState } from "react";

// ⚙️ Règles d'envoi WhatsApp — mets ton vrai numéro ici (format international)
const OWNER_WHATSAPP = "+33600000000";

type Service = { id: string; name: string; durationMin: number; price: number; deposit: number; };
type Barber = {
  id: string;
  name: string;
  city: string;
  workingHours: Record<number, { start: string; end: string }>;
  breaks: { start: string; end: string }[];
};

const SERVICES: Service[] = [
  { id: "cut", name: "Coupe", durationMin: 30, price: 20, deposit: 5 },
  { id: "beard", name: "Barbe", durationMin: 20, price: 12, deposit: 4 },
  { id: "combo", name: "Coupe + Barbe", durationMin: 45, price: 30, deposit: 8 },
];

const BARBERS: Barber[] = [
  {
    id: "ayoub",
    name: "Ayoub",
    city: "Paris 11",
    workingHours: {
      1: { start: "10:00", end: "19:00" },
      2: { start: "10:00", end: "19:00" },
      3: { start: "10:00", end: "19:00" },
      4: { start: "10:00", end: "19:00" },
      5: { start: "10:00", end: "19:00" },
      6: { start: "11:00", end: "17:00" },
    },
    breaks: [{ start: "13:30", end: "14:00" }],
  },
  {
    id: "moussa",
    name: "Moussa",
    city: "Paris 15",
    workingHours: {
      1: { start: "09:30", end: "18:30" },
      2: { start: "09:30", end: "18:30" },
      3: { start: "09:30", end: "18:30" },
      4: { start: "12:00", end: "20:00" },
      5: { start: "09:30", end: "18:30" },
      6: { start: "10:00", end: "16:00" },
    },
    breaks: [{ start: "12:45", end: "13:15" }],
  },
];

const EXISTING_APPTS: Record<string, string[]> = {
  // key = `${barberId}|YYYY-MM-DD` -> array d'ISO start times
};

// ------- Utils temps -------
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const minutesToHHMM = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
const toISODateTime = (date: string, hhmm: string) => `${date}T${hhmm}:00`;
const sameDayKey = (barberId: string, date: string) => `${barberId}|${date}`;

function waLink(to: string, text: string){
  const num = to.replace(/[^0-9]/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

function overlapsBreak(startMin: number, endMin: number, breaks: { start: string; end: string }[]) {
  return breaks.some((b) => {
    const bs = toMinutes(b.start);
    const be = toMinutes(b.end);
    return Math.max(startMin, bs) < Math.min(endMin, be);
  });
}

function overlapsExisting(isoStart: string, durationMin: number, existingStarts: string[]) {
  const startDate = new Date(isoStart);
  const startMin = startDate.getHours() * 60 + startDate.getMinutes();
  const endMin = startMin + durationMin;
  return existingStarts.some((iso) => {
    const d = new Date(iso);
    const s = d.getHours() * 60 + d.getMinutes();
    const e = s + durationMin; // simplif
    return Math.max(startMin, s) < Math.min(endMin, e);
  });
}

function generateSlots(
  date: string,
  barber: Barber,
  durationMin: number,
  bufferMin = 10
) {
  const dow = new Date(date + "T00:00:00").getDay();
  const range = barber.workingHours[dow as keyof typeof barber.workingHours];
  if (!range) return [] as string[];

  const start = toMinutes(range.start);
  const end = toMinutes(range.end);
  const step = 5;
  const slots: string[] = [];

  const occupied = EXISTING_APPTS[sameDayKey(barber.id, date)] || [];

  for (let t = start; t + durationMin <= end; t += step) {
    const s = t;
    const e = t + durationMin;
    const sWithBuffer = s - bufferMin;
    const eWithBuffer = e + bufferMin;

    const hhmm = minutesToHHMM(s);
    if (hhmm.endsWith(":55")) continue;
    if (overlapsBreak(sWithBuffer, eWithBuffer, barber.breaks)) continue;

    const iso = toISODateTime(date, hhmm);
    if (overlapsExisting(iso, durationMin, occupied)) continue;

    const mm = hhmm.split(":")[1];
    if (!(["00", "15", "30", "45"].includes(mm))) continue;

    slots.push(hhmm);
  }
  return slots;
}

export default function App() {
  const [serviceId, setServiceId] = useState<string>(SERVICES[0].id);
  const [barberId, setBarberId] = useState<string>(BARBERS[0].id);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [paid, setPaid] = useState(false);

  const service = useMemo(() => SERVICES.find((s) => s.id === serviceId)!, [serviceId]);
  const barber = useMemo(() => BARBERS.find((b) => b.id === barberId)!, [barberId]);
  const slots = useMemo(() => generateSlots(date, barber, service.durationMin), [date, barber, service.durationMin]);

  const canGoStep2 = Boolean(serviceId && barberId);
  const canGoStep3 = Boolean(date && time);
  const canPay = Boolean(fullName && phone);

  function resetToStart() {
    setStep(1);
    setTime("");
    setPaid(false);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white antialiased">
      <header className="sticky top-0 z-10 backdrop-blur bg-neutral-950/70 border-b border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 grid place-items-center font-black text-neutral-900">BB</div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">BarberBook</h1>
              <p className="text-xs text-white/60 -mt-0.5">Réserve en 30 secondes</p>
            </div>
          </div>
          <div className="text-xs text-white/60">MVP démo (paiement simulé)</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 grid md:grid-cols-3 gap-6">
        <section className="md:col-span-2 space-y-6">
          <div className="flex items-center gap-2 text-xs">
            {[1,2,3,4].map((i) => (
              <div key={i} className={`flex items-center gap-2 ${step === i ? "text-amber-400" : "text-white/50"}`}>
                <div className={`h-6 w-6 rounded-full grid place-items-center border ${step === i ? "border-amber-400" : "border-white/20"}`}>{i}</div>
                <span className="uppercase tracking-wider">{["Service","Créneau","Infos","Paiement"][i-1]}</span>
                {i < 4 && <div className="w-10 h-px bg-white/20" />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h2 className="text-base font-semibold mb-3">Choisis ton service</h2>
                <div className="grid sm:grid-cols-3 gap-3">
                  {SERVICES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setServiceId(s.id)}
                      className={`text-left rounded-xl p-4 border transition ${serviceId === s.id ? "border-amber-400 bg-amber-400/10" : "border-white/10 hover:border-white/20"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-sm text-white/70">{s.durationMin} min</span>
                      </div>
                      <div className="mt-1 text-sm text-white/70">{s.price}€ · acompte {s.deposit}€</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h2 className="text-base font-semibold mb-3">Choisis ton barbier</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {BARBERS.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBarberId(b.id)}
                      className={`text-left rounded-xl p-4 border transition ${barberId === b.id ? "border-amber-400 bg-amber-400/10" : "border-white/10 hover:border-white/20"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{b.name}</div>
                          <div className="text-xs text-white/60">{b.city}</div>
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-white/60">Disponibilités dynamiques</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  disabled={!canGoStep2}
                  onClick={() => setStep(2)}
                  className={`px-5 py-3 rounded-xl font-semibold ${canGoStep2 ? "bg-amber-400 text-neutral-900 hover:brightness-95" : "bg-white/10 text-white/40 cursor-not-allowed"}`}
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h2 className="text-base font-semibold mb-3">Choisis la date</h2>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => { setDate(e.target.value); setTime(""); }}
                  className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-2"
                />
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h2 className="text-base font-semibold mb-3">Choisis l'heure</h2>
                {slots.length === 0 ? (
                  <div className="text-sm text-white/70">Aucun créneau dispo ce jour. Change de date.</div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {slots.map((hhmm) => (
                      <button
                        key={hhmm}
                        onClick={() => setTime(hhmm)}
                        className={`px-3 py-2 rounded-lg text-sm border transition ${time === hhmm ? "border-amber-400 bg-amber-400/10" : "border-white/10 hover:border-white/20"}`}
                      >
                        {hhmm}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl bg-white/10">Retour</button>
                <button
                  disabled={!canGoStep3}
                  onClick={() => setStep(3)}
                  className={`px-5 py-3 rounded-xl font-semibold ${canGoStep3 ? "bg-amber-400 text-neutral-900 hover:brightness-95" : "bg-white/10 text-white/40 cursor-not-allowed"}`}
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h2 className="text-base font-semibold mb-3">Tes infos</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-white/70">Nom & Prénom</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Karim Diop"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-white/70">Téléphone (WhatsApp)</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: +33 6 12 34 56 78"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2"
                    />
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <label className="text-xs text-white/70">Notes (facultatif)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: dégradé bas, moustache fine"
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 h-20"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="px-4 py-2 rounded-xl bg-white/10">Retour</button>
                <button
                  disabled={!Boolean(fullName && phone)}
                  onClick={() => setStep(4)}
                  className={`px-5 py-3 rounded-xl font-semibold ${Boolean(fullName && phone) ? "bg-amber-400 text-neutral-900 hover:brightness-95" : "bg-white/10 text-white/40 cursor-not-allowed"}`}
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h2 className="text-base font-semibold mb-3">Acompte sécurisé</h2>
                <p className="text-sm text-white/70 mb-3">Paiement simulé (Stripe à brancher). Montant dû maintenant: <span className="text-white font-semibold">{service.deposit}€</span></p>
                {!paid ? (
                  <button
                    onClick={() => setPaid(true)}
                    className="px-5 py-3 rounded-xl font-semibold bg-amber-400 text-neutral-900 hover:brightness-95"
                  >
                    Payer {service.deposit}€ (démo)
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-400/30">
                    <div className="font-semibold text-emerald-300">Paiement confirmé ✔</div>
                    <div className="text-sm text-white/80 mt-1">Ton créneau est réservé.</div>
                  </div>
                )}
              </div>

              {paid && (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <h3 className="text-base font-semibold mb-2">Confirmation</h3>
                  <p className="text-sm text-white/70">Tu peux envoyer le récap en 1 clic :</p>

                  <div className="mt-3 grid sm:grid-cols-2 gap-2">
                    <a
                      href={waLink(phone || "", `Bonjour ${fullName.split(" ")[0]}, ta réservation est confirmée ✂️\\n\\nSalon: ${barber.name} (${barber.city})\\nService: ${service.name} (${service.durationMin} min)\\nDate: ${date} à ${time}\\nAcompte reçu: ${service.deposit}€ (reste à payer: ${service.price - service.deposit}€)\\n\\nPolitique anti no-show: acompte non remboursé si annulation < 3h avant.\\nÀ très vite !`)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-3 rounded-xl font-semibold bg-emerald-400 text-neutral-900 text-center hover:brightness-95"
                      onClick={(e) => { if(!phone){ e.preventDefault(); alert('Ajoute le numéro du client pour envoyer sur WhatsApp.'); } }}
                    >
                      Envoyer au client (WhatsApp)
                    </a>
                    <a
                      href={waLink(OWNER_WHATSAPP, `NOUVELLE RÉSERVATION ✅\\nClient: ${fullName} (${phone})\\nSalon: ${barber.name} - ${barber.city}\\nService: ${service.name} (${service.durationMin} min)\\nDate: ${date} à ${time}\\nAcompte: ${service.deposit}€ · Total: ${service.price}€\\nNotes: ${notes || '—'}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-3 rounded-xl font-semibold bg-amber-400 text-neutral-900 text-center hover:brightness-95"
                    >
                      M'envoyer sur mon WhatsApp
                    </a>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button onClick={resetToStart} className="px-4 py-2 rounded-xl bg-white/10">Nouvelle réservation</button>
                    <button onClick={() => alert("(Démo) Lien iCal envoyé !")} className="px-4 py-2 rounded-xl bg-white/10">Ajouter au calendrier</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 sticky top-20">
            <h3 className="text-base font-semibold mb-2">Récapitulatif</h3>
            <ul className="text-sm space-y-2">
              <li className="flex justify-between"><span className="text-white/60">Service</span><span>{service.name}</span></li>
              <li className="flex justify-between"><span className="text-white/60">Durée</span><span>{service.durationMin} min</span></li>
              <li className="flex justify-between"><span className="text-white/60">Barbier</span><span>{barber.name}</span></li>
              <li className="flex justify-between"><span className="text-white/60">Date</span><span>{date || "—"}</span></li>
              <li className="flex justify-between"><span className="text-white/60">Heure</span><span>{time || "—"}</span></li>
            </ul>
            <div className="h-px bg-white/10 my-3" />
            <div className="flex justify-between text-sm"><span className="text-white/60">Acompte</span><span>{service.deposit}€</span></div>
            <div className="flex justify-between text-sm"><span className="text-white/60">Reste à payer</span><span>{service.price - service.deposit}€</span></div>
            <div className="flex justify-between text-base font-semibold mt-2"><span>Total</span><span>{service.price}€</span></div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h4 className="font-semibold mb-1">Règles</h4>
            <ul className="text-xs text-white/70 space-y-1 list-disc list-inside">
              <li>No-show: acompte non remboursé si annulation &lt; 3h</li>
              <li>Buffer de 10 min entre chaque coupe</li>
              <li>Confirmation par WhatsApp J-1 et H-2 (via API à brancher)</li>
            </ul>
          </div>
        </aside>
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 text-center text-xs text-white/50">
        BarberBook · Démo frontend — © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
