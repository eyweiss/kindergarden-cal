import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Admin.module.css";

const DAYS = ["ראשון","שני","שלישי","רביעי","חמישי","שישי"];
const KEYS = ["sun","mon","tue","wed","thu","fri"];
const COLORS = ["#FF6B6B","#FF8E53","#FFD93D","#6BCB77","#4ECDC4","#45B7D1"];

interface Note { id: number; text: string; date: string; }

export default function Admin() {
  const [pin, setPin]           = useState("");
  const [authed, setAuthed]     = useState(false);
  const [pinError, setPinError] = useState(false);
  const [calendar, setCalendar] = useState<Record<string, string[]>>({});
  const [notes, setNotes]       = useState<Note[]>([]);
  const [newNote, setNewNote]   = useState("");
  const [stars, setStars]       = useState<string[]>([]);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [newEvent, setNewEvent] = useState<Record<string, string>>({});
  const [newStar, setNewStar]   = useState("");
  const [openDay, setOpenDay]   = useState<string | null>(null);

  useEffect(() => {
    if (!authed) return;
    fetch("/api/data").then(r => r.json()).then(d => {
      setCalendar(d.calendar || {});
      setNotes(d.notes || []);
      setStars(d.stars || []);
    });
  }, [authed]);

  const handlePin = () => {
    const correct = process.env.NEXT_PUBLIC_ADMIN_PIN || "1234";
    if (pin === correct) { setAuthed(true); setPinError(false); }
    else { setPinError(true); setPin(""); }
  };

  const clearCalendar = () => {
    if (!window.confirm("למחוק את כל האירועים של השבוע?")) return;
    const empty: Record<string, string[]> = {};
    KEYS.forEach(k => (empty[k] = []));
    setCalendar(empty);
  };

  const addEvent = (key: string) => {
    const val = (newEvent[key] || "").trim();
    if (!val) return;
    setCalendar(p => ({ ...p, [key]: [...(p[key] || []), val] }));
    setNewEvent(p => ({ ...p, [key]: "" }));
  };

  const removeEvent = (key: string, idx: number) =>
    setCalendar(p => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));

  const addNote = () => {
    const text = newNote.trim();
    if (!text) return;
    const date = new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" });
    setNotes(p => [{ id: Date.now(), text, date }, ...p]);
    setNewNote("");
  };

  const removeNote = (id: number) => setNotes(p => p.filter(n => n.id !== id));

  const addStar = () => {
    const val = newStar.trim();
    if (!val) return;
    setStars(p => [...p, val]);
    setNewStar("");
  };

  const removeStar = (idx: number) => setStars(p => p.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendar, notes, stars }),
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
          <h1 className={styles.adminTitle}>✏️ לוח גן לבנון</h1>
          <div className={styles.headerActions}>
            <button
              className={`${styles.saveBtn} ${saved ? styles.savedBtn : ""}`}
              onClick={handleSave} disabled={saving}
            >
              {saving ? "שומר..." : saved ? "✓ נשמר!" : "💾 שמור"}
            </button>
            <Link href="/" className={styles.viewLink}>👀 הורים</Link>
          </div>
        </header>

        <main className={styles.adminMain}>

          {/* Calendar */}
          <section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.adminSectionTitle}>📅 אירועי השבוע</h2>
              <button className={styles.clearBtn} onClick={clearCalendar}>🗑 מחק הכל</button>
            </div>
            <div className={styles.desktopGrid}>
              {DAYS.map((dayName, i) => {
                const key = KEYS[i];
                const events = calendar[key] || [];
                return (
                  <div key={key} className={styles.adminDayCard} style={{ borderTopColor: COLORS[i] }}>
                    <div className={styles.adminDayName}>{dayName}</div>
                    <div className={styles.adminEventList}>
                      {events.map((ev, j) => (
                        <div key={j} className={styles.adminEventItem}>
                          <span>{ev}</span>
                          <button className={styles.removeBtn} onClick={() => removeEvent(key, j)}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div className={styles.addEventRow}>
                      <input type="text" className={styles.addInput}
                        placeholder="הוסיפי אירוע..."
                        value={newEvent[key] || ""}
                        onChange={e => setNewEvent(p => ({ ...p, [key]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && addEvent(key)}
                      />
                      <button className={styles.addBtn} onClick={() => addEvent(key)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.mobileAccordion}>
              {DAYS.map((dayName, i) => {
                const key = KEYS[i];
                const events = calendar[key] || [];
                const isOpen = openDay === key;
                return (
                  <div key={key} className={styles.accordionItem} style={{ borderRightColor: COLORS[i] }}>
                    <button className={styles.accordionHeader} onClick={() => setOpenDay(isOpen ? null : key)}>
                      <span className={styles.accordionDay}>{dayName}</span>
                      <span className={styles.accordionMeta}>
                        {events.length > 0 && <span className={styles.eventCount}>{events.length} אירועים</span>}
                        <span className={styles.accordionArrow}>{isOpen ? "▲" : "▼"}</span>
                      </span>
                    </button>
                    {isOpen && (
                      <div className={styles.accordionBody}>
                        {events.map((ev, j) => (
                          <div key={j} className={styles.accordionEvent}>
                            <span>{ev}</span>
                            <button className={styles.removeBtn} onClick={() => removeEvent(key, j)}>✕</button>
                          </div>
                        ))}
                        <div className={styles.accordionAdd}>
                          <input type="text" className={styles.accordionInput}
                            placeholder="הוסיפי אירוע..."
                            value={newEvent[key] || ""}
                            onChange={e => setNewEvent(p => ({ ...p, [key]: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && addEvent(key)}
                            autoFocus
                          />
                          <button className={styles.accordionAddBtn} onClick={() => addEvent(key)}>הוסיפי</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Notes */}
          <section>
            <h2 className={styles.adminSectionTitle}>📝 הודעות והערות</h2>
            <div className={styles.notesPanel}>
              {/* Add new note */}
              <div className={styles.addNoteBox}>
                <textarea
                  className={styles.addNoteInput}
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="כתבי הודעה חדשה..."
                  rows={3}
                  onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) addNote(); }}
                />
                <button className={styles.addNoteBtn} onClick={addNote}>
                  ＋ הוסיפי הודעה
                </button>
              </div>

              {/* Existing notes */}
              {notes.length > 0 && (
                <div className={styles.notesList}>
                  {notes.map((note) => (
                    <div key={note.id} className={styles.adminNoteCard}>
                      <div className={styles.adminNoteTop}>
                        <span className={styles.adminNoteDate}>{note.date}</span>
                        <button className={styles.removeBtn} onClick={() => removeNote(note.id)}>✕ מחקי</button>
                      </div>
                      <p className={styles.adminNoteText}>{note.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Stars */}
          <section>
            <h2 className={styles.adminSectionTitle}>⭐ כוכבי השבוע</h2>
            <div className={styles.starsBox}>
              <div className={styles.starsGrid}>
                {stars.map((star, i) => (
                  <div key={i} className={styles.starItem}>
                    <span>⭐ {star}</span>
                    <button className={styles.removeBtn} onClick={() => removeStar(i)}>✕</button>
                  </div>
                ))}
              </div>
              <div className={styles.addEventRow} style={{ marginTop: stars.length ? "0.5rem" : 0 }}>
                <input type="text" className={styles.addInput}
                  placeholder="שם הילד/ה..."
                  value={newStar}
                  onChange={e => setNewStar(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addStar()}
                />
                <button className={styles.addBtn} onClick={addStar}>+</button>
              </div>
            </div>
          </section>

        </main>
      </div>
    </>
  );
}
