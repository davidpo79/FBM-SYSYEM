export type QuestionSection =
  | 'identity'    // פיצוח הזהות
  | 'empathy'     // גשר האמפתיה
  | 'proof'       // ההוכחה והשיטה
  | 'polarize'    // הקיטוב
  | 'legacy'      // חזון ומורשת
  // GTM sections
  | 'product'     // Product & Problem
  | 'market'      // Market & ICP
  | 'gtm';        // Go-To-Market

export interface Question {
  id: string;
  section: QuestionSection;
  sectionTitle: string;
  title: string;
  text: string;
}

export interface QuestionnaireAnswers {
  [questionId: string]: string;
}

const SECTION_TITLES: Record<QuestionSection, string> = {
  identity: 'פיצוח הזהות',
  empathy: 'גשר האמפתיה',
  proof: 'ההוכחה והשיטה',
  polarize: 'הקיטוב',
  legacy: 'חזון ומורשת',
  product: 'Product & Problem',
  market: 'Market & ICP',
  gtm: 'Go-To-Market Strategy',
};

export type ProjectMode = 'self' | 'client' | 'owner';

export function getQuestions(niche?: string, projectMode?: ProjectMode): Question[] {
  // אם אין נישה = משווק FBM שממלא על עצמו
  if (!niche || niche.trim() === '') {
    return getMarketerQuestions();
  }
  // בעל עסק שממלא על עצמו = שאלות בגוף שני
  if (projectMode === 'owner') {
    return getOwnerSelfQuestions(niche);
  }
  // משווק ממלא עבור בעל העסק = שאלות בגוף שלישי
  return getBusinessOwnerQuestions(niche);
}

// ========================================
// גרסה א': שאלות למשווק FBM (ממלא על עצמו)
// ========================================

function getMarketerQuestions(): Question[] {
  return [
    // ── חלק א': פיצוח הזהות ──
    {
      id: '1',
      section: 'identity',
      sectionTitle: SECTION_TITLES.identity,
      title: 'שאלת "הלמה" האמיתי',
      text: 'מעבר לרצון להקים עסק ולהרוויח כסף, מה באמת מניע אותך לעזור לבעלי עסקים אחרים עם השיווק שלהם? למה דווקא התחום הזה? ספר על רגע או תקופה בחיים שהובילו אותך להבנה ששיווק "רגיל" לא עובד.',
    },
    {
      id: '2',
      section: 'identity',
      sectionTitle: SECTION_TITLES.identity,
      title: 'סיפור המקור שלך',
      text: 'ספר על חוויה אישית או מקצועית שבה הרגשת שאתה "מפצח" את הדרך לתקשר עם אנשים, לשכנע, או להוביל אותם. זה יכול להיות מהצבא, מעבודה קודמת, מתחביב או אפילו מהמשפחה.',
    },
    {
      id: '3',
      section: 'identity',
      sectionTitle: SECTION_TITLES.identity,
      title: 'התשוקה לעזור',
      text: 'איזה סוג של הצלחה אצל לקוח עתידי שלך תגרום לך להרגיש את הסיפוק הגדול ביותר? למשל: לראות אותו מקבל ביטחון, מרוויח יותר, מקבל הכרה.',
    },

    // ── חלק ב': גשר האמפתיה ──
    {
      id: '4',
      section: 'empathy',
      sectionTitle: SECTION_TITLES.empathy,
      title: 'זיהוי הלקוח האידיאלי עבורך',
      text: 'עם איזה סוג של בעלי עסקים אתה הכי נהנה לדבר ולבלות? תאר את בעל העסק שהיית הכי נהנה לעזור לו — מה האופי שלו? מה הערכים שלו?',
    },
    {
      id: '5',
      section: 'empathy',
      sectionTitle: SECTION_TITLES.empathy,
      title: 'הפחדים והתסכולים שאתה מזהה',
      text: 'כשאתה מסתכל על בעלי עסקים סביבך, מה התסכול הכי גדול שאתה מזהה אצלם בכל מה שקשור לשיווק וצמיחה? מה הפחד הכי עמוק שלדעתך מנהל אותם?',
    },

    // ── חלק ג': ההוכחה והשיטה ──
    {
      id: '6',
      section: 'proof',
      sectionTitle: SECTION_TITLES.proof,
      title: 'החוזקות שלך',
      text: 'מהן 3-5 החוזקות הכי גדולות שלך שאתה מביא איתך לשולחן? למשל: יכולת פישוט, יצירתיות, הבנה במספרים, סדר וארגון, יכולת הקשבה.',
    },
    {
      id: '7',
      section: 'proof',
      sectionTitle: SECTION_TITLES.proof,
      title: 'החזון — התוצאה הסופית',
      text: 'תאר את התוצאה הסופית האידיאלית של לקוח שיעבוד איתך. איך ייראו החיים והעסק שלו בעוד שנה?',
    },

    // ── חלק ד': הקיטוב ──
    {
      id: '8',
      section: 'polarize',
      sectionTitle: SECTION_TITLES.polarize,
      title: '"הדעה הלא פופולרית" שלך על שיווק',
      text: 'מהי דעה או אמונה שיש לך על שיווק שעומדת בניגוד למה ש"כולם" חושבים או עושים?',
    },
    {
      id: '9',
      section: 'polarize',
      sectionTitle: SECTION_TITLES.polarize,
      title: '"הלקוח מהגיהנום" — המסננת שלך',
      text: 'תאר את סוג הלקוח או הנישה שאתה בשום אופן לא מוכן לעבוד איתה. מה מאפיין אותם?',
    },

    // ── חלק ה': חזון ומורשת ──
    {
      id: '10',
      section: 'legacy',
      sectionTitle: SECTION_TITLES.legacy,
      title: 'המורשת שלך',
      text: 'בעוד שנתיים, כשסוכנות השיווק שלך מצליחה, מה היית רוצה שלקוחות יגידו עליך ועל העבודה שלך איתם? מה יהיה ה-Legacy שלך?',
    },
  ];
}

// ========================================
// גרסה ב': שאלות לבעל עסק (המשווק ממלא עבורו)
// niche = הנישה של בעל העסק, למשל "יועץ משכנתאות"
// ========================================

function getBusinessOwnerQuestions(niche: string): Question[] {
  const n = niche.trim();

  return [
    // ── חלק א': פיצוח הזהות ──
    {
      id: '1',
      section: 'identity',
      sectionTitle: SECTION_TITLES.identity,
      title: 'שאלת "הלמה" האמיתי',
      text: `מעבר לרצון להרוויח כסף, מה באמת מניע את בעל העסק (${n}) לעשות את מה שהוא עושה? למה דווקא התחום הזה? ספר על רגע או תקופה שהובילו אותו להבנה שזה מה שהוא רוצה לעשות בחיים.`,
    },
    {
      id: '2',
      section: 'identity',
      sectionTitle: SECTION_TITLES.identity,
      title: 'סיפור המקור',
      text: `ספר על חוויה אישית או מקצועית של בעל העסק (${n}) שבה הוא הרגיש שהוא "מפצח" את הדרך שלו — הרגע שהבין שזה מה שהוא אמור לעשות. זה יכול להיות מהצבא, מעבודה קודמת, מתחביב או מהמשפחה.`,
    },
    {
      id: '3',
      section: 'identity',
      sectionTitle: SECTION_TITLES.identity,
      title: 'התשוקה לעזור',
      text: `איזה סוג של הצלחה אצל לקוח של ה${n} תגרום לו להרגיש את הסיפוק הגדול ביותר? למשל: לראות לקוח שמקבל ביטחון, חוסך כסף, משיג תוצאות.`,
    },

    // ── חלק ב': גשר האמפתיה ──
    {
      id: '4',
      section: 'empathy',
      sectionTitle: SECTION_TITLES.empathy,
      title: 'הלקוח האידיאלי',
      text: `עם איזה סוג של לקוחות ה${n} הכי נהנה לעבוד? תאר את הלקוח האידיאלי שלו — מה האופי שלו? מה הוא מחפש? למה הוא צריך ${n}?`,
    },
    {
      id: '5',
      section: 'empathy',
      sectionTitle: SECTION_TITLES.empathy,
      title: 'הפחדים והתסכולים',
      text: `מה התסכול הכי גדול שה${n} מזהה אצל הלקוחות שלו? מה הפחד הכי עמוק שלדעתו מנהל אותם? מה מונע מהם לפעול?`,
    },

    // ── חלק ג': ההוכחה והשיטה ──
    {
      id: '6',
      section: 'proof',
      sectionTitle: SECTION_TITLES.proof,
      title: 'החוזקות',
      text: `מהן 3-5 החוזקות הכי גדולות של ה${n}? מה הוא מביא איתו לשולחן שמבדל אותו מאחרים בתחום? למשל: ידע, ניסיון, גישה ייחודית, יכולת הקשבה, יצירתיות.`,
    },
    {
      id: '7',
      section: 'proof',
      sectionTitle: SECTION_TITLES.proof,
      title: 'החזון — התוצאה הסופית',
      text: `תאר את התוצאה הסופית האידיאלית של לקוח שעובד עם ה${n}. איך ייראו החיים שלו בעוד שנה? מה ישתנה?`,
    },

    // ── חלק ד': הקיטוב ──
    {
      id: '8',
      section: 'polarize',
      sectionTitle: SECTION_TITLES.polarize,
      title: '"הדעה הלא פופולרית"',
      text: `מהי דעה או אמונה שיש ל${n} על התחום שלו שעומדת בניגוד למה ש"כולם" חושבים או עושים? מה הוא יודע שאחרים לא?`,
    },
    {
      id: '9',
      section: 'polarize',
      sectionTitle: SECTION_TITLES.polarize,
      title: '"הלקוח מהגיהנום" — המסננת',
      text: `תאר את סוג הלקוח שה${n} בשום אופן לא מוכן לעבוד איתו. מה מאפיין אותם? למה הם לא מתאימים?`,
    },

    // ── חלק ה': חזון ומורשת ──
    {
      id: '10',
      section: 'legacy',
      sectionTitle: SECTION_TITLES.legacy,
      title: 'המורשת',
      text: `בעוד שנתיים, כשהעסק של ה${n} בשיא, מה הוא היה רוצה שלקוחות יגידו עליו ועל העבודה שלו איתם? מה יהיה ה-Legacy שלו?`,
    },
  ];
}

// ========================================
// גרסה ג': שאלות לבעל עסק שממלא על עצמו (גוף שני)
// niche = הנישה של בעל העסק, למשל "מאמן כושר"
// ========================================

function getOwnerSelfQuestions(niche: string): Question[] {
  const n = niche.trim();

  return [
    // ── חלק א': פיצוח הזהות ──
    {
      id: '1',
      section: 'identity',
      sectionTitle: SECTION_TITLES.identity,
      title: 'שאלת "הלמה" האמיתי',
      text: `מעבר לרצון להרוויח כסף, מה באמת מניע אותך לעשות את מה שאתה עושה כ${n}? למה דווקא התחום הזה? ספר על רגע או תקופה בחיים שהובילו אותך להבנה שזה מה שאתה רוצה לעשות.`,
    },
    {
      id: '2',
      section: 'identity',
      sectionTitle: SECTION_TITLES.identity,
      title: 'סיפור המקור שלך',
      text: `ספר על חוויה אישית או מקצועית שבה הרגשת שאתה "מפצח" את הדרך שלך כ${n} — הרגע שהבנת שזה מה שאתה אמור לעשות. זה יכול להיות מהצבא, מעבודה קודמת, מתחביב או מהמשפחה.`,
    },
    {
      id: '3',
      section: 'identity',
      sectionTitle: SECTION_TITLES.identity,
      title: 'התשוקה לעזור',
      text: `איזה סוג של הצלחה אצל לקוח שלך תגרום לך להרגיש את הסיפוק הגדול ביותר? למשל: לראות לקוח שמקבל ביטחון, חוסך כסף, משיג תוצאות.`,
    },

    // ── חלק ב': גשר האמפתיה ──
    {
      id: '4',
      section: 'empathy',
      sectionTitle: SECTION_TITLES.empathy,
      title: 'הלקוח האידיאלי שלך',
      text: `עם איזה סוג של לקוחות אתה הכי נהנה לעבוד? תאר את הלקוח האידיאלי שלך — מה האופי שלו? מה הוא מחפש? למה הוא צריך ${n}?`,
    },
    {
      id: '5',
      section: 'empathy',
      sectionTitle: SECTION_TITLES.empathy,
      title: 'הפחדים והתסכולים שאתה מזהה',
      text: `מה התסכול הכי גדול שאתה מזהה אצל הלקוחות שלך? מה הפחד הכי עמוק שלדעתך מנהל אותם? מה מונע מהם לפעול?`,
    },

    // ── חלק ג': ההוכחה והשיטה ──
    {
      id: '6',
      section: 'proof',
      sectionTitle: SECTION_TITLES.proof,
      title: 'החוזקות שלך',
      text: `מהן 3-5 החוזקות הכי גדולות שלך כ${n}? מה אתה מביא איתך לשולחן שמבדל אותך מאחרים בתחום? למשל: ידע, ניסיון, גישה ייחודית, יכולת הקשבה, יצירתיות.`,
    },
    {
      id: '7',
      section: 'proof',
      sectionTitle: SECTION_TITLES.proof,
      title: 'החזון — התוצאה הסופית',
      text: `תאר את התוצאה הסופית האידיאלית של לקוח שעובד איתך. איך ייראו החיים שלו בעוד שנה? מה ישתנה?`,
    },

    // ── חלק ד': הקיטוב ──
    {
      id: '8',
      section: 'polarize',
      sectionTitle: SECTION_TITLES.polarize,
      title: '"הדעה הלא פופולרית" שלך',
      text: `מהי דעה או אמונה שיש לך על התחום שלך שעומדת בניגוד למה ש"כולם" חושבים או עושים? מה אתה יודע שאחרים לא?`,
    },
    {
      id: '9',
      section: 'polarize',
      sectionTitle: SECTION_TITLES.polarize,
      title: '"הלקוח מהגיהנום" — המסננת שלך',
      text: `תאר את סוג הלקוח שאתה בשום אופן לא מוכן לעבוד איתו. מה מאפיין אותם? למה הם לא מתאימים לך?`,
    },

    // ── חלק ה': חזון ומורשת ──
    {
      id: '10',
      section: 'legacy',
      sectionTitle: SECTION_TITLES.legacy,
      title: 'המורשת שלך',
      text: `בעוד שנתיים, כשהעסק שלך בשיא, מה היית רוצה שלקוחות יגידו עליך ועל העבודה שלך איתם? מה יהיה ה-Legacy שלך?`,
    },
  ];
}

// ========================================
// GTM BootCamp Questions (Tech Entrepreneurs)
// ========================================

const GTM_SECTION_TITLES: Record<string, string> = {
  product: 'המוצר והבעיה',
  market: 'שוק וקהל יעד',
  gtm: 'אסטרטגיית Go-To-Market',
};

export function getGTMQuestions(): Question[] {
  return [
    // ── המוצר והבעיה ──
    {
      id: '1',
      section: 'product',
      sectionTitle: GTM_SECTION_TITLES.product,
      title: 'הבעיה',
      text: 'איזו בעיה ספציפית המוצר שלך פותר? תאר את נקודת הכאב בפירוט — מי מרגיש אותה, כמה פעמים, ומה קורה אם היא לא נפתרת?',
    },
    {
      id: '2',
      section: 'product',
      sectionTitle: GTM_SECTION_TITLES.product,
      title: 'הפתרון שלך',
      text: 'תאר את המוצר/פתרון שלך ב-2-3 משפטים. מה מבדיל אותו מחלופות קיימות? מה הגישה או הטכנולוגיה הייחודית שלך?',
    },
    {
      id: '3',
      section: 'product',
      sectionTitle: GTM_SECTION_TITLES.product,
      title: 'סיפור המקור',
      text: 'איך גילית את הבעיה הזו? איזו חוויה אישית או תובנה הובילה אותך לבנות את הפתרון הזה? למה דווקא אתה האדם הנכון לפתור את זה?',
    },

    // ── שוק וקהל יעד ──
    {
      id: '4',
      section: 'market',
      sectionTitle: GTM_SECTION_TITLES.market,
      title: 'פרופיל לקוח אידיאלי',
      text: 'תאר את 100 הלקוחות הראשונים האידיאליים שלך בפירוט. מה התפקיד/תואר שלהם? גודל חברה? תעשייה? אילו כלים הם משתמשים כיום?',
    },
    {
      id: '5',
      section: 'market',
      sectionTitle: GTM_SECTION_TITLES.market,
      title: 'גודל שוק והזדמנות',
      text: 'כמה גדול השוק לפתרון שלך? כמה לקוחות פוטנציאליים קיימים? מה ה-TAM/SAM/SOM המשוער? יש טרנדים בשוק שמשחקים לטובתך?',
    },
    {
      id: '6',
      section: 'market',
      sectionTitle: GTM_SECTION_TITLES.market,
      title: 'נוף תחרותי',
      text: 'מי המתחרים העיקריים שלך (ישירים ועקיפים)? מה הם עושים טוב? מה הם מפספסים? איך אתה ממוקם מולם?',
    },

    // ── אסטרטגיית Go-To-Market ──
    {
      id: '7',
      section: 'gtm',
      sectionTitle: GTM_SECTION_TITLES.gtm,
      title: 'תמחור ומודל הכנסות',
      text: 'מה מודל התמחור שלך? (מנוי SaaS, מבוסס שימוש, פרימיום, חד פעמי?) איזה מחיר אתה שוקל ולמה?',
    },
    {
      id: '8',
      section: 'gtm',
      sectionTitle: GTM_SECTION_TITLES.gtm,
      title: 'ערוצי הפצה',
      text: 'איפה לקוחות היעד שלך מבלים אונליין? אילו ערוצים תשתמש כדי להגיע אליהם? (Product Hunt, LinkedIn, קהילות, SEO, פרסום ממומן, שותפויות?)',
    },
    {
      id: '9',
      section: 'gtm',
      sectionTitle: GTM_SECTION_TITLES.gtm,
      title: 'סטטוס ולידציה',
      text: 'איזו ולידציה עשית עד כה? יש לך משתמשים מוקדמים, רשימת המתנה, LOI, או הכנסות? איזה פידבק קיבלת?',
    },
    {
      id: '10',
      section: 'gtm',
      sectionTitle: GTM_SECTION_TITLES.gtm,
      title: 'יעדי השקה',
      text: 'איך נראית הצלחה ב-90 הימים הקרובים? מה המדדים המרכזיים שלך (משתמשים, הכנסות, שימור)? מה לוח הזמנים ל-MVP שלך?',
    },
  ];
}

// Backward-compatible export for code that imports the static array
export const questions = getQuestions();
