import { buildRule, describe as describeRule, iso, isoWeek, maxUntil, monday, ruleDays, weekday, fromIso, addDays } from './week';

describe('week', () => {
  it('monday() e weekday() partono dal lunedì', () => {
    const fri = new Date(2026, 10, 13); // venerdì 13/11/2026
    expect(weekday(fri)).toBe(4);
    expect(iso(monday(fri))).toBe('2026-11-09');
    expect(iso(monday(new Date(2026, 10, 15)))).toBe('2026-11-09'); // domenica
  });

  it('iso e fromIso fanno il giro senza spostare il giorno', () => {
    expect(iso(fromIso('2026-12-31'))).toBe('2026-12-31');
    expect(iso(addDays(fromIso('2026-12-31'), 1))).toBe('2027-01-01');
  });

  it('isoWeek come lo standard', () => {
    expect(isoWeek(new Date(2026, 10, 9))).toBe(46);
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1);
  });

  it('maxUntil: 2 mesi, mai sabato o domenica', () => {
    expect(iso(maxUntil(fromIso('2026-11-13')))).toBe('2027-01-13'); // mercoledì
    expect(iso(maxUntil(fromIso('2026-11-15')))).toBe('2027-01-15'); // venerdì
    // dal 02/11 il 02/01/2027 è sabato → venerdì 01/01
    expect(iso(maxUntil(fromIso('2026-11-02')))).toBe('2027-01-01');
  });

  it('buildRule ordina i giorni e scrive UNTIL', () => {
    expect(buildRule([2, 0], fromIso('2026-12-04'))).toBe('FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261204');
  });

  it('ruleDays legge BYDAY', () => {
    expect(ruleDays('FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231')).toEqual([0, 2, 4]);
    expect(ruleDays(null)).toEqual([]);
    expect(ruleDays('FREQ=WEEKLY')).toEqual([]);
  });

  it('describe: orario per il singolo, testo per la serie', () => {
    expect(describeRule(null, fromIso('2026-11-16'))).toBe('08:30 – 09:30');
    expect(describeRule('FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261204', fromIso('2026-11-16'))).toBe('Ogni lun, mer · fino al 04/12');
    expect(describeRule('FREQ=WEEKLY', fromIso('2026-11-18'))).toBe('Ogni mer');
  });
});
