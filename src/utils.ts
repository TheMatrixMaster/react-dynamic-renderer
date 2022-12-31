/**
 * Utility functions for main rendering code
 */

const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

type DateLike = number | string | Date;

type GetParams = {
  value: object;
  path: string;
  def?: any;
};

export const get = ({ value, path, def = undefined }: GetParams) => {
  // TODO: remove need for this by checking for all uses of get()
  path = String(path).replace(/\[([^\]]+)\]/g, '.$1');
  return path.split('.').reduce((acc: any, v) => {
    try {
      acc = acc[v] === undefined ? def : acc[v];
    } catch (e) {
      return def;
    }
    return acc;
  }, value);
};

export function convertDate(date_: Date) {
  if (typeof date_.getMonth === 'function') {
    const yyyy = date_.getFullYear().toString();
    const mm = (date_.getMonth() + 1).toString();
    const dd = date_.getDate().toString();

    const mmChars = mm.split('');
    const ddChars = dd.split('');

    return (
      yyyy +
      '-' +
      (mmChars[1] ? mm : '0' + mmChars[0]) +
      '-' +
      (ddChars[1] ? dd : '0' + ddChars[0])
    );
  } else return '';
}

export function prettyTime(datetime: Date, use24hClock: boolean = false) {
  const hh = datetime.getHours();
  let mm = datetime.getMinutes().toString();

  if (mm.length === 1) mm = '0' + mm;

  if (use24hClock) return `${hh}:${mm}`;

  if (hh > 12) {
    const modulo = hh - 12;
    return `${modulo}:${mm} PM`;
  } else if (hh === 12) {
    return `${hh}:${mm} PM`;
  } else {
    return `${hh}:${mm} AM`;
  }
}

export const getTime = (dateString: DateLike) => {
  if (!dateString) return;

  const addTime = new Date(dateString);
  const ms = addTime.getTime();

  // start of day
  const sod = new Date();
  sod.setHours(0, 0, 0, 0);

  // start of yesterday
  const soy = new Date(sod);
  soy.setDate(sod.getDate() - 1);

  // start of last week
  const sow = new Date(sod);
  sow.setDate(sod.getDate() - 7);

  if (ms - sod.getTime() > 0) return prettyTime(addTime);
  else if (ms - soy.getTime() > 0)
    return 'yesterday' + '\n' + prettyTime(addTime);
  else if (ms - sow.getTime() > 0) return days[addTime.getDay()];
  else return convertDate(addTime);
};
