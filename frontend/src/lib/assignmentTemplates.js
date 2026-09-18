export function templateDeadline(template, now = new Date()) {
  const days = Number(template.dueDays);
  if (!Number.isInteger(days) || days < 1 || days > 30 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(template.dueTime || '')) return '';
  const date = new Date(now);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  const [hours, minutes] = template.dueTime.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function templateDeadlineLabel(template) {
  return templateDeadline(template) ? `Due ${template.dueDays} day${Number(template.dueDays) === 1 ? '' : 's'} after reuse at ${template.dueTime} (your local time)` : 'Set the due date when you reuse this template';
}
