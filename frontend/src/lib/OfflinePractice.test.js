import { buildOfflinePack } from './offlineDocument';

const words = [{ word: 'bee', definition: 'A bee is an insect.', spellingTip: 'Two e letters.' }, { word: 'moon', definition: 'It orbits a planet.' }];
const el = id => document.getElementById(id);
function openPack(title = 'Garden', items = words) {
  const html = buildOfflinePack(title, items);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  document.body.innerHTML = html.replace(/<script>[\s\S]*?<\/script>/, '');
  // Exercise the exact standalone script shipped in the downloaded file.
  // eslint-disable-next-line no-new-func
  new Function(script)();
  return html;
}
function answer(value) { el('answer').value = value; el('form').dispatchEvent(new Event('submit', { cancelable: true })); }
beforeEach(() => localStorage.clear());
afterEach(() => { document.body.innerHTML = ''; jest.restoreAllMocks(); });

test('offline practice resumes, rejects duplicate submissions and replays missed words', () => {
  openPack();
  expect(el('clue').textContent).not.toContain('bee');
  answer('bee'); answer('bee');
  openPack(); expect(el('count').textContent).toBe('Word 2 of 2');
  answer('mun'); el('next').click();
  expect(el('count').textContent).toContain('1 / 2');
  expect(el('review').textContent).toContain('moon');
  el('retry').click(); expect(el('count').textContent).toBe('Word 1 of 1');
  answer('moon'); el('next').click();
  expect(el('count').textContent).toContain('1 / 1');
  expect(el('retry').disabled).toBe(true);
  el('replay').click(); expect(el('count').textContent).toBe('Word 1 of 2');
});

test('offline packs are isolated and hostile text is displayed as text', () => {
  const html = openPack('</script><img src=x onerror=alert(1)>');
  expect(html.match(/<script>/g)).toHaveLength(1);
  expect(document.querySelector('img')).toBeNull();
  answer('bee');
  openPack('Other', [{ word: 'star', definition: 'A star shines.' }]);
  expect(el('count').textContent).toBe('Word 1 of 1');
  openPack(); expect(el('count').textContent).toBe('Word 2 of 2');
});

test('offline practice still works when browser storage is blocked', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  openPack(); answer('bee'); el('next').click();
  expect(el('count').textContent).toBe('Word 2 of 2');
  expect(el('storage').textContent).toContain('unavailable');
});

test('invalid saved rounds are ignored rather than crashing', () => {
  openPack(); answer('bee');
  const key = localStorage.key(0), saved = JSON.parse(localStorage.getItem(key));
  saved.order = [999]; localStorage.setItem(key, JSON.stringify(saved));
  openPack(); expect(el('count').textContent).toBe('Word 1 of 2');
});
