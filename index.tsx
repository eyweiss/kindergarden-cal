import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Home.module.css";

const DAYS  = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
const KEYS  = ["sun","mon","tue","wed","thu","fri","sat"];
const COLOR_CLASSES: Record<string, string> = {
  sun: styles.sun, mon: styles.mon, tue: styles.tue,
  wed: styles.wed, thu: styles.thu, fri: styles.fri,
};

function getWeekDates() {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  return KEYS.map((_, i) => { const d = new Date(sunday); d.setDate(sunday.getDate() + i); return d; });
}

export default function Home() {
  const [data, setData] = useState<any>(null);
  const dates = getWeekDates();

  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(setData).catch(() => setData({}));
  }, []);

  const weekLabel = `${dates[0].getDate()}/${dates[0].getMonth()+1} – ${dates[5].getDate()}/${dates[5].getMonth()+1}/${dates[5].getFullYear()}`;

  return (
    <>
      <Head>
        <title>לוח הגן</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Secular+One&family=Heebo:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </Head>
      <div className={styles.page} dir="rtl">
        <header className={styles.header}>
          <div className={styles.headerEmojis}>🌈 🦋 🌻</div>
          <h1 className={styles.title}>לוח הגן</h1>
          <p className={styles.subtitle}>שבוע {weekLabel}</p>
        </header>

        <main className={styles.main}>
          <section>
            <h2 className={styles.sectionTitle}>📅 לוח שבועי</h2>
            <div className={styles.calendarGrid}>
              {DAYS.map((dayName, i) => {
                const key = KEYS[i];
                const isSat = i === 6;
                const events: string[] = data?.calendar?.[key] || [];
                const dateStr = `${dates[i].getDate()}/${dates[i].getMonth()+1}`;
                const cardClass = [styles.dayCard, isSat ? styles.satCard : COLOR_CLASSES[key]].join(" ");
                return (
                  <div key={key} className={cardClass}>
                    <div className={styles.dayHeader}>
                      <span className={styles.dayName}>{dayName}</span>
                      <span className={styles.dayDate}>{dateStr}</span>
                    </div>
                    <div className={styles.dayBody}>
                      {events.length === 0
                        ? <span className={styles.empty}>—</span>
                        : events.map((ev, j) => <div key={j} className={styles.event}>{ev}</div>)
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.notesSection}>
            <h2 className={styles.sectionTitle}>📝 הודעות והערות</h2>
            <div className={styles.notesBox}>
              {!data?.notes
                ? <p className={styles.empty}>אין הערות השבוע</p>
                : <p className={styles.notesText}>{data.notes}</p>
              }
            </div>
          </section>
        </main>

        <footer className={styles.footer}>
          <Link href="/admin" className={styles.adminLink}>כניסת גננת 🔐</Link>
        </footer>
      </div>
    </>
  );
}
