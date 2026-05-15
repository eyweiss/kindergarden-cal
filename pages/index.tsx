import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { getHolidayForDate } from "../lib/holidays";
import styles from "../styles/Home.module.css";

type Lang = "he" | "en" | "ru";

const DAYS_MAP: Record<Lang, string[]> = {
  he: ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"],
  en: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  ru: ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"],
};

const SPEECH_LANG: Record<Lang, string> = {
  he: "he-IL",
  en: "en-US",
  ru: "ru-RU",
};

const T: Record<Lang, {
  title: string; week: string; calendar: string; notes: string;
  noNotes: string; stars: string; noStars: string; remindersLabel: string;
  speakTitle: string; tempToday: string; adminLink: string; dayPrefix: string;
}> = {
  he: {
    title: "לוח גן לבנון ה'תשפ\"ו",
    week: "שבוע",
    calendar: "📅 לוח שבועי",
    notes: "📝 הודעות והערות",
    noNotes: "אין הודעות השבוע",
    stars: "⭐ כוכבי השבוע",
    noStars: "אין כוכבים השבוע עדיין",
    remindersLabel: "📌 חשוב לזכור",
    speakTitle: "קרא בקול",
    tempToday: "טמפרטורה היום",
    adminLink: "כניסת גננת 🔐",
    dayPrefix: "יום ",
  },
  en: {
    title: "Lebanon Kindergarten 2025–26",
    week: "Week",
    calendar: "📅 Weekly Calendar",
    notes: "📝 Messages & Notes",
    noNotes: "No messages this week",
    stars: "⭐ Stars of the Week",
    noStars: "No stars this week yet",
    remindersLabel: "📌 Remember",
    speakTitle: "Read aloud",
    tempToday: "Today's temperature",
    adminLink: "Teacher login 🔐",
    dayPrefix: "",
  },
  ru: {
    title: "Детский сад «Ливан» 2025–26",
    week: "Неделя",
    calendar: "📅 Еженедельный календарь",
    notes: "📝 Сообщения и заметки",
    noNotes: "Нет сообщений на этой неделе",
    stars: "⭐ Звёзды недели",
    noStars: "Звёзд пока нет",
    remindersLabel: "📌 Не забыть",
    speakTitle: "Прочитать вслух",
    tempToday: "Температура сегодня",
    adminLink: "Вход для воспитателя 🔐",
    dayPrefix: "",
  },
};

const KEYS  = ["sun","mon","tue","wed","thu","fri","sat"];
const COLOR_CLASSES: Record<string, string> = {
  sun: styles.sun, mon: styles.mon, tue: styles.tue,
  wed: styles.wed, thu: styles.thu, fri: styles.fri,
};

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const showNextWeek = day === 6 || (day === 5 && today.getHours() >= 16);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - day + (showNextWeek ? 7 : 0));
  return KEYS.map((_, i) => { const d = new Date(sunday); d.setDate(sunday.getDate() + i); return d; });
}

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [weather, setWeather] = useState<{ temp: number; emoji: string; tempMin: number; tempMax: number } | null>(null);
  const [hasSpeech, setHasSpeech] = useState(false);
  const [dates, setDates] = useState<Date[]>(getWeekDates);
  // null during SSR so no day is highlighted until the client runs — prevents
  // stale server-timezone dates from pinning the highlight to the wrong day.
  const [today, setToday] = useState<Date | null>(null);
  const [lang, setLang] = useState<Lang>("he");

  useEffect(() => {
    setHasSpeech("speechSynthesis" in window);
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved && (saved === "he" || saved === "en" || saved === "ru")) setLang(saved);
  }, []);

  useEffect(() => {
    // Keep today and dates in sync; both are set from the same client clock so
    // they can never disagree about which calendar day is "now".
    const update = () => { setToday(new Date()); setDates(getWeekDates()); };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = () => fetch("/api/data").then(r => r.json()).then(setData).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/weather").then(r => r.json()).then(d => d.temp != null && setWeather(d)).catch(() => {});
  }, []);

  function changeLang(l: Lang) {
    setLang(l);
    localStorage.setItem("lang", l);
  }

  const t = T[lang];
  const DAYS = DAYS_MAP[lang];
  const dir = lang === "he" ? "rtl" : "ltr";
  const weekLabel = `${dates[0].getDate()}/${dates[0].getMonth()+1} – ${dates[5].getDate()}/${dates[5].getMonth()+1}/${dates[5].getFullYear()}`;
  const stars: string[] = data?.stars || [];
  const notes: any[] = data?.notes || [];

  return (
    <>
      <Head>
        <title>לוח גן לבנון</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Secular+One&family=Heebo:wght@300;400;500;700&family=Rubik:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </Head>
      <div className={styles.page} dir={dir} data-lang={lang}>
        <header className={styles.header}>
          {weather && (
            <div className={styles.weatherBadge}>
              <span>{weather.emoji}</span>
              <span>{weather.temp}°</span>
            </div>
          )}
          <div className={styles.langToggle}>
            <button
              className={`${styles.langBtn} ${lang === "he" ? styles.langBtnActive : ""}`}
              onClick={() => changeLang("he")}
              aria-label="עברית"
            >עב</button>
            <button
              className={`${styles.langBtn} ${lang === "en" ? styles.langBtnActive : ""}`}
              onClick={() => changeLang("en")}
              aria-label="English"
            >EN</button>
            <button
              className={`${styles.langBtn} ${lang === "ru" ? styles.langBtnActive : ""}`}
              onClick={() => changeLang("ru")}
              aria-label="Русский"
            >РУ</button>
          </div>
          <div className={styles.headerEmojis}>🌈 🦋 🌻</div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.week} {weekLabel}</p>
        </header>

        <main className={styles.main}>
          <div className={styles.layout}>
            <div className={styles.leftCol}>

              {/* Calendar */}
              <section>
                <h2 className={styles.sectionTitle}>{t.calendar}</h2>
                <div className={styles.calendarGrid}>
                  {(() => {
                    const nextSchoolDay = today ? (() => {
                      const d = new Date(today);
                      d.setDate(today.getDate() + 1);
                      if (d.getDay() === 6) d.setDate(d.getDate() + 1);
                      return d;
                    })() : null;
                    return DAYS.map((dayName, i) => {
                    const key = KEYS[i];
                    const isSat = i === 6;
                    const events: string[] = data?.calendar?.[key] || [];
                    const holiday = getHolidayForDate(dates[i]);
                    const dateStr = `${dates[i].getDate()}/${dates[i].getMonth()+1}`;
                    const sameDate = (d: Date) => !isSat &&
                      dates[i].getFullYear() === d.getFullYear() &&
                      dates[i].getMonth() === d.getMonth() &&
                      dates[i].getDate() === d.getDate();
                    const isToday = today ? sameDate(today) : false;
                    const isNextSchoolDay = nextSchoolDay ? sameDate(nextSchoolDay) : false;
                    const cardClass = [styles.dayCard, isSat ? styles.satCard : COLOR_CLASSES[key], isToday ? styles.todayCard : ""].filter(Boolean).join(" ");
                    return (
                      <div key={key} className={cardClass}>
                        {(isToday || isNextSchoolDay) && hasSpeech && (
                          <button
                            className={styles.speakBtn}
                            title={t.speakTitle}
                            aria-label={t.speakTitle}
                            onClick={() => {
                              window.speechSynthesis.cancel();
                              // Speak day name in selected language
                              const dayUtt = new SpeechSynthesisUtterance(`${t.dayPrefix}${dayName}`);
                              dayUtt.lang = SPEECH_LANG[lang];
                              window.speechSynthesis.speak(dayUtt);
                              // Speak calendar content in Hebrew (content is stored in Hebrew)
                              const parts: string[] = [];
                              if (holiday) parts.push(holiday);
                              events.forEach(ev => parts.push(ev));
                              (data?.reminders?.[key] as string[] || []).forEach(r => parts.push(r));
                              if (parts.length > 0) {
                                const contentUtt = new SpeechSynthesisUtterance(parts.join(". "));
                                contentUtt.lang = "he-IL";
                                window.speechSynthesis.speak(contentUtt);
                              }
                            }}
                          >🔊</button>
                        )}
                        <div className={styles.dayHeader}>
                          <span className={styles.dayName}>{dayName}</span>
                          <span className={styles.dayDate}>{dateStr}</span>
                        </div>
                        <div className={styles.dayBody}>
                          {holiday && <div className={styles.holiday}>✡️ {holiday}</div>}
                          {events.length === 0 && !holiday
                            ? <span className={styles.empty}>—</span>
                            : events.map((ev, j) => <div key={j} className={styles.event}>{ev}</div>)
                          }
                          {(data?.reminders?.[key] || []).length > 0 && (
                            <div className={styles.remindersBlock}>
                              <div className={styles.remindersLabel}>{t.remindersLabel}</div>
                              {(data.reminders[key] as string[]).map((r: string, j: number) => (
                                <div key={j} className={styles.reminderEntry}>{r}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });})()}
                </div>
                {weather && (
                  <div className={styles.weatherRange}>
                    <span>{weather.emoji}</span>
                    <span>{t.tempToday}</span>
                    <span className={styles.weatherRangeTemps}>{weather.tempMin}° – {weather.tempMax}°</span>
                  </div>
                )}
              </section>

              {/* Notes feed */}
              <section className={styles.notesSection}>
                <h2 className={styles.sectionTitle}>{t.notes}</h2>
                <div className={styles.notesFeed}>
                  {notes.length === 0
                    ? <p className={styles.emptyNotes}>{t.noNotes}</p>
                    : notes.map((note: any) => (
                        <div key={note.id} className={styles.noteCard}>
                          <p className={styles.noteText}>{note.text}</p>
                          <span className={styles.noteDate}>{note.date}</span>
                        </div>
                      ))
                  }
                </div>
              </section>

            </div>

            {/* Stars */}
            <div className={styles.rightCol}>
              <section className={styles.starsSection}>
                <h2 className={styles.starsSectionTitle}>{t.stars}</h2>
                <div className={styles.starsBox}>
                  {stars.length === 0
                    ? <p className={styles.empty}>{t.noStars}</p>
                    : stars.map((star, i) => (
                        <div key={i} className={styles.starItem}>
                          <span className={styles.starEmoji}>⭐</span>
                          <span className={styles.starName}>{star}</span>
                        </div>
                      ))
                  }
                </div>
              </section>
            </div>
          </div>
        </main>

        <footer className={styles.footer}>
          <Link href="/admin" className={styles.adminLink}>{t.adminLink}</Link>
        </footer>
      </div>
    </>
  );
}
