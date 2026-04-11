import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Admin.module.css";

const DAYS = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
const KEYS = ["sun","mon","tue","wed","thu","fri","sat"];
const ADMIN_COLOR: Record<string, string> = {
  sun: styles.adminSun, mon: styles.adminMon, tue: styles.adminTue,
  wed: styles.adminWed, thu: styles.adminThu, fri: styles.adminFri,
};

export default function Admin() {
  const [pin, setPin]           = useState("");
  const [authed, setAuthed]     = useState(false);
  const [pinError, setPinError] = useState(false);
  const [calendar, setCalendar] = useState<Record<string, string[]>>({});
  const [notes, setNotes]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [newEvent, setNewEvent] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authed) return;
    fetch("/api/data").then(r => r.json()).then(d => {
      setCalendar(d.calendar || {});
      setNotes(d.notes || "");
    });
  }, [authed]);

  const handlePin = () => {
    const correct = process.env.NEXT_PUBLIC_ADMIN_PIN || "1234";
    if (pin === correct) { setAuthed(true); setPinError(false); }
    else { setPinError(true); setPin(""); }
  };

  const addEvent = (key: string) => {
    const val = (newEvent[key] || "").trim();
    if (!val) return;
    setCalendar(p => ({ ...p, [key]: [...(p[key] || []), val] }));
    setNewEvent(p => ({ ...p, [key]: "" }));
  };

  const removeEvent = (key: string, idx: number) => {
    setCalendar(p => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendar, notes }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!authed) return (
    <>
      <Head>
        <title>כניסת גננת</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Secular+One&family=Heebo:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </Head>
      <div className={styles.pinScreen} dir="rtl">
        <div className={styles.pinBox}>
          <div className={styles.pinEmoji}>🔐</div>
          <h1 className={styles.pinTitle}>כניסת גננת</h1>
          <p className={styles.pinSub}>הכניסי קוד גישה</p>
          <input
            type="password" inputMode="numeric" maxLength={6}
            className={`${styles.pinInput} ${pinError ? styles.pinInputError : ""}`}
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(false); }}
            onKeyDown={e => e.key === "Enter" && handlePin()}
            placeholder="• • • •" autoFocus
          />
          {pinError && <p className={styles.errorMsg}>קוד שגוי, נסי שנית</p>}
          <button className={styles.pinBtn} onClick={handlePin}>כניסה</button>
          <Link href="/" className={styles.backLink}>← חזרה ללוח ההורים</Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Head>
        <title>עריכת לוח הגן</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Secular+One&family=Heebo:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </Head>
      <div className={styles.adminPage} dir="rtl">
        <header className={styles.adminHeader}>
          <h1 className={styles.adminTitle}>✏️ עריכת לוח השבוע</h1>
          <div className={styles.headerActions}>
            <button
              className={`${styles.saveBtn} ${saved ? styles.savedBtn : ""}`}
              onClick={handleSave} disabled={saving}
            >
              {saving ? "שומר..." : saved ? "✓ נשמר!" : "💾 שמור שינויים"}
            </button>
            <Link href="/" className={styles.viewLink}>👀 לוח הורים</Link>
          </div>
        </header>

        <main className={styles.adminMain}>
          <section>
            <h2 className={styles.adminSectionTitle}>📅 אירועי השבוע</h2>
            <div className={styles.adminGrid}>
              {DAYS.map((dayName, i) => {
                const key = KEYS[i];
                const isSat = i === 6;
                const events = calendar[key] || [];
                const cardClass = [styles.adminDayCard, isSat ? styles.satCard : ADMIN_COLOR[key]].filter(Boolean).join(" ");
                return (
                  <div key={key} className={cardClass}>
                    <div className={styles.adminDayName}>{dayName}</div>
                    <div className={styles.adminEventList}>
                      {events.map((ev, j) => (
                        <div key={j} className={styles.adminEventItem}>
                          <span>{ev}</span>
                          <button className={styles.removeBtn} onClick={() => removeEvent(key, j)}>✕</button>
                        </div>
                      ))}
                    </div>
                    {!isSat && (
                      <div className={styles.addEventRow}>
                        <input
                          type="text"
                          className={styles.addInput}
                          placeholder="הוסיפי אירוע..."
                          value={newEvent[key] || ""}
                          onChange={e => setNewEvent(p => ({ ...p, [key]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && addEvent(key)}
                        />
                        <button className={styles.addBtn} onClick={() => addEvent(key)}>+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className={styles.adminSectionTitle}>📝 הודעות והערות</h2>
            <textarea
              className={styles.notesTextarea}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="כתבי הודעות, תזכורות, דברים חשובים להורים..."
              rows={6}
            />
          </section>
        </main>
      </div>
    </>
  );
}
