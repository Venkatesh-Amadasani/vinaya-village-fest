import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "te";
const dict = {
  home: ["Home", "హోమ్"], donations: ["Donations", "విరాళాలు"], expenses: ["Expenses", "ఖర్చులు"],
  auctions: ["Auctions", "వేలాలు"], gallery: ["Gallery", "గ్యాలరీ"], years: ["Previous Years", "గత సంవత్సరాలు"],
  youth: ["Youth", "యువత"], admin: ["Admin", "నిర్వాహకులు"], notifications: ["Notifications", "నోటిఫికేషన్లు"],
  signIn: ["Sign in", "లాగిన్"], signOut: ["Sign out", "లాగౌట్"], viewingAs: ["Viewing as", "చూస్తున్నది"],
  publicVisitor: ["Public visitor", "సాధారణ సందర్శకుడు"],
  transparency: ["Financial transparency", "ఆర్థిక పారదర్శకత"], transparencySub: ["General fund — open to everyone", "సాధారణ నిధి — అందరికీ బహిరంగం"],
  collected: ["Donations collected", "వసూలైన విరాళాలు"], spent: ["Total expenses", "మొత్తం ఖర్చులు"],
  auctionCollected: ["Auction received", "వేలం వసూలు"], balance: ["Balance in hand", "చేతిలో నిల్వ"],
  auctionCommitted: ["Auction committed", "వేలం హామీ"], highlights: ["Highlights", "ముఖ్యాంశాలు"],
  recentDonations: ["Donations", "విరాళాలు"], viewAll: ["View all", "అన్నీ చూడండి"],
  search: ["Search by name…", "పేరుతో వెతకండి…"], all: ["All", "అన్నీ"], general: ["General", "సాధారణ"],
  both: ["Both", "రెండూ"], total: ["Total", "మొత్తం"], donor: ["Donor", "దాత"], amount: ["Amount", "మొత్తం"],
  date: ["Date", "తేదీ"], method: ["Method", "విధానం"], category: ["Category", "వర్గం"], description: ["Description", "వివరణ"],
  paidTo: ["Paid to", "చెల్లించినది"], winner: ["Winner", "విజేత"], finalAmount: ["Final amount", "చివరి మొత్తం"],
  paid: ["Paid", "చెల్లించినది"], remaining: ["Remaining", "మిగిలినది"], contributions: ["Contributions", "చెల్లింపులు"],
  hiddenContrib: ["Contributor details are visible to approved Youth members only", "చెల్లింపుదారుల వివరాలు ఆమోదిత యువత సభ్యులకు మాత్రమే"],
  forYear: ["For festival", "ఉత్సవం కోసం"], individual: ["Individual", "వ్యక్తిగత"], group: ["Group", "సమూహం"],
  PENDING: ["Pending", "పెండింగ్"], PARTIAL: ["Partly paid", "పాక్షికం"], PAID: ["Fully paid", "పూర్తిగా చెల్లించారు"],
  add: ["Add", "జోడించు"], addDonation: ["Add donation", "విరాళం జోడించు"], addExpense: ["Add expense", "ఖర్చు జోడించు"],
  addContribution: ["Record payment", "చెల్లింపు నమోదు"], save: ["Save", "సేవ్"], cancel: ["Cancel", "రద్దు"],
  delete: ["Remove", "తొలగించు"], reason: ["Reason", "కారణం"], empty: ["Nothing recorded yet", "ఇంకా ఏమీ నమోదు కాలేదు"],
  denied: ["You don't have access to this section", "ఈ విభాగానికి మీకు అనుమతి లేదు"],
  deniedSub: ["Sign in with an approved account to continue.", "కొనసాగడానికి ఆమోదిత ఖాతాతో లాగిన్ అవ్వండి."],
  error: ["Something went wrong", "ఏదో పొరపాటు జరిగింది"], retry: ["Try again", "మళ్ళీ ప్రయత్నించండి"],
  markAllRead: ["Mark all read", "అన్నీ చదివినట్లు"], noNotifications: ["You're all caught up", "కొత్త నోటిఫికేషన్లు లేవు"],
  preferences: ["Preferences", "ప్రాధాన్యతలు"], youthFund: ["Youth fund", "యువత నిధి"], combined: ["Combined", "కలిపి"],
  expenseByCategory: ["Where the money went", "డబ్బు ఎక్కడ ఖర్చైంది"], prev: ["Previous", "మునుపటి"], next: ["Next", "తర్వాత"],
  showing: ["Showing", "చూపిస్తోంది"], of: ["of", "లో"], status: ["Status", "స్థితి"], current: ["Current", "ప్రస్తుత"],
  demoNotice: ["Demo data — changes are not saved permanently yet.", "డెమో డేటా — మార్పులు ఇంకా శాశ్వతంగా సేవ్ కావు."],
  PLANNING: ["Planning", "ప్రణాళిక"], ACTIVE: ["Active", "జరుగుతోంది"], FINAL_REVIEW: ["Final review", "తుది సమీక్ష"],
  CLOSED: ["Closed", "ముగిసింది"], ARCHIVED: ["Archived", "భద్రపరచబడింది"],
  donors: ["donors", "దాతలు"], village: ["Village", "గ్రామం"], split: ["Split", "విభజన"], seeYear: ["Open year", "సంవత్సరం చూడండి"],
  combinedFund: ["Combined (General + Youth)", "మొత్తం (సాధారణ + యువత)"], youthFund: ["Youth fund", "యువత నిధి"], auctionOutstanding: ["Auction outstanding", "వేలం బాకీ"], demoSignInNote: ["Demo sign-in only — real accounts and permanent storage are not connected yet.", "డెమో లాగిన్ మాత్రమే — నిజమైన ఖాతాలు మరియు శాశ్వత నిల్వ ఇంకా అనుసంధానించలేదు."],
  dashboard: ["Dashboard", "డాష్‌బోర్డ్"], details: ["Details", "వివరాలు"], edit: ["Edit", "సవరించు"], myDashboard: ["My dashboard", "నా డాష్‌బోర్డ్"], demoBadge: ["Demo data", "డెమో డేటా"], back: ["Back", "వెనుకకు"],
  readOnly: ["This festival is closed — records are read-only.", "ఈ ఉత్సవం ముగిసింది — రికార్డులు చదవడానికి మాత్రమే."],
  history: ["Change history", "మార్పుల చరిత్ర"], festival: ["Festival", "ఉత్సవం"], youthDashboard: ["Youth dashboard", "యువత డాష్‌బోర్డ్"],
  members: ["Members", "సభ్యులు"], demoAccounts: ["Choose a demo account", "డెమో ఖాతాను ఎంచుకోండి"],
  demoAuthNote: ["Demo sign-in only. Real phone/OTP sign-in will replace this.", "డెమో లాగిన్ మాత్రమే. నిజమైన ఫోన్/OTP లాగిన్ తర్వాత వస్తుంది."],
  unread: ["unread", "చదవనివి"], markRead: ["Mark read", "చదివినట్లు"], inApp: ["In-app notifications only (free).", "యాప్‌లో నోటిఫికేషన్లు మాత్రమే (ఉచితం)."],
  ANNOUNCEMENT: ["Announcements", "ప్రకటనలు"], DONATION: ["Donations", "విరాళాలు"], EXPENSE: ["Expenses", "ఖర్చులు"],
  AUCTION: ["Auctions", "వేలాలు"], APPROVAL: ["Approvals", "ఆమోదాలు"], SYSTEM: ["System", "సిస్టమ్"],
  settings: ["Festival settings", "ఉత్సవ సెట్టింగ్‌లు"], users: ["Users & permissions", "వినియోగదారులు & అనుమతులు"],
  memories: ["Memories & media", "జ్ఞాపకాలు & మీడియా"], records: ["Financial records", "ఆర్థిక రికార్డులు"],
  auditLog: ["Audit log", "ఆడిట్ లాగ్"], reports: ["Reports & export", "నివేదికలు & ఎగుమతి"], overview: ["Overview", "సారాంశం"],
} as const;
export type Key = keyof typeof dict;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "en", setLang: () => {}, t: (k) => dict[k][0],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const s = window.localStorage.getItem("vvc_lang");
    if (s === "te" || s === "en") setLangState(s);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (l: Lang) => { setLangState(l); window.localStorage.setItem("vvc_lang", l); };
  return <Ctx.Provider value={{ lang, setLang, t: (k) => dict[k][lang === "en" ? 0 : 1] }}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
/** Pick bilingual DB content; user-entered text otherwise shown exactly as entered. */
export const pick = (lang: Lang, en: string, te: string) => (lang === "te" && te ? te : en);
