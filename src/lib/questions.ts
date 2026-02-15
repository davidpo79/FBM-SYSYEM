export interface Question {
  id: string;
  section: string;
  title: string;
  text: string;
}

export interface QuestionnaireAnswers {
  [questionId: string]: string;
}

export function getQuestions(niche?: string): Question[] {
  const n = niche || '';
  const asNiche = n ? ` כ${n}` : '';
  const fromOthers = n ? `מ${n}ים אחרים` : 'מהמתחרים';
  const inField = n ? ` בתחום ה${n}` : '';

  return [
    {
      id: '1',
      section: 'פיצוח הזהות',
      title: 'המניע האמיתי',
      text: `מה באמת מניע אותך${asNiche}? לא "כסף" או "הצלחה" — מה הדבר העמוק שגורם לך לקום בבוקר ולעשות את מה שאתה עושה?`,
    },
    {
      id: '2',
      section: 'פיצוח הזהות',
      title: 'סיפור המקור',
      text: `ספר לי על הרגע שהבנת שאתה רוצה להיות ${n || 'בתחום הזה'}. מה קרה? איזה אירוע או תחושה הובילו אותך לנקודה הזו?`,
    },
    {
      id: '3',
      section: 'זיהוי הלקוח',
      title: 'הלקוח האידיאלי',
      text: `מי הלקוח האידיאלי שלך${asNiche}? תאר אדם ספציפי — גיל, מצב, מה הוא מרגיש, מה הוא מחפש.`,
    },
    {
      id: '4',
      section: 'הערך הייחודי',
      title: 'הבידול שלך',
      text: `מה מבדל אותך ${fromOthers}? מה הגישה הייחודית שלך שאף אחד אחר לא מביא?`,
    },
    {
      id: '5',
      section: 'הערך הייחודי',
      title: 'הצלחה שמשנה',
      text: `ספר על לקוח שעברת איתו תהליך${inField} ושינית לו את החיים. מה קרה? מה הרגשת?`,
    },
    {
      id: '6',
      section: 'הערך הייחודי',
      title: 'הערכים שלך',
      text: `אילו ערכים מנחים אותך${asNiche}? מה הקו האדום שלך? על מה לא תתפשר?`,
    },
    {
      id: '7',
      section: 'המורשת',
      title: 'החזון',
      text: `איפה אתה רואה את עצמך${asNiche} בעוד 3 שנים? מה החלום הגדול?`,
    },
    {
      id: '8',
      section: 'קיטוב ומיצוב',
      title: 'האתגר הגדול',
      text: `מה האתגר הכי גדול שלך היום${inField}? מה מונע ממך להגיע לשם?`,
    },
    {
      id: '9',
      section: 'קיטוב ומיצוב',
      title: 'המסר ללקוח',
      text: `אם היית יכול להגיד משפט אחד ללקוח האידיאלי שלך${inField} — מה היית אומר?`,
    },
    {
      id: '10',
      section: 'המורשת',
      title: 'למה עכשיו',
      text: `למה דווקא עכשיו הזמן הנכון${inField}? מה השתנה בשוק או אצלך?`,
    },
  ];
}

// Backward-compatible export for code that imports the static array
export const questions = getQuestions();
